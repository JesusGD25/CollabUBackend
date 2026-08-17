import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MicroserviceHttpClient, EventPublisher } from '@collab-u/shared';
import { MatchWeight } from './entities/match-weight.entity';
import { MatchResult, SkillsBreakdown } from './entities/match-result.entity';
import { MatchRecommendation } from './entities/match-recommendation.entity';
import { MatchFeedback } from './entities/match-feedback.entity';
import {
  MatchFactor,
  WeightScope,
  CompatibilityLevel,
  TargetType,
  RecommendationType,
} from './entities/enums';
import {
  BatchCalculateMatchDto,
  UpdateWeightsDto,
  RecommendationQueryDto,
  SubmitFeedbackDto,
} from './dto';

// Interfaces para datos externos — deben reflejar exactamente lo que devuelven
// los endpoints /internal/students/:id/matching-data y /internal/projects/:id/matching-data
// (sin wrapper `{ data: ... }`, ambos servicios responden el objeto directo).

type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface StudentSkill {
  name: string;
  catalogSkillId: string | null;
  category: string;
  proficiencyLevel: ProficiencyLevel;
}

interface StudentLanguage {
  language: string;
  proficiency: string;
}

interface StudentExperience {
  type: string;
  yearsEquivalent: number;
}

interface StudentData {
  studentId: string;
  userId: string;
  program: string;
  programId?: string | null;
  semester: number;
  availability?: string; // 'full_time' | 'part_time' | 'flexible'
  skills: StudentSkill[];
  languages: StudentLanguage[];
  experiences: StudentExperience[];
}

interface ProjectRequirement {
  type: 'skill' | 'education' | 'experience' | 'language' | 'certification' | 'other';
  name: string;
  isMandatory: boolean;
  proficiencyLevel?: string | null;
}

interface ProjectSkill {
  name: string;
  catalogSkillId: string | null;
  category: string;
  proficiencyLevel: ProficiencyLevel | null;
  isMandatory: boolean;
}

interface ProjectData {
  projectId: string;
  title: string;
  academicPrograms?: string[]; // IDs de programas académicos (admin-service)
  minimumSemester?: number;
  locationType?: string; // 'remote' | 'onsite' | 'hybrid'
  requirements: ProjectRequirement[];
  skills: ProjectSkill[];
}

const PROFICIENCY_RANK: Record<ProficiencyLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.js$/i, '')
    .replace(/\.ts$/i, '');
}

/** Umbral desde el cual un match genera recomendación (decisión de negocio, ver /matching en frontend). */
const RECOMMENDED_THRESHOLD = 50;

const DEFAULT_WEIGHTS: Record<MatchFactor, number> = {
  [MatchFactor.SKILLS_MATCH]: 0.45,
  [MatchFactor.PROFICIENCY_MATCH]: 0.15,
  [MatchFactor.PROGRAM_MATCH]: 0.15,
  [MatchFactor.SEMESTER_MATCH]: 0.1,
  [MatchFactor.AVAILABILITY_MATCH]: 0.1,
  [MatchFactor.LANGUAGE_MATCH]: 0.05,
};

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  constructor(
    @InjectRepository(MatchWeight)
    private readonly weightRepo: Repository<MatchWeight>,
    @InjectRepository(MatchResult)
    private readonly resultRepo: Repository<MatchResult>,
    @InjectRepository(MatchRecommendation)
    private readonly recommendationRepo: Repository<MatchRecommendation>,
    @InjectRepository(MatchFeedback)
    private readonly feedbackRepo: Repository<MatchFeedback>,
    private readonly httpClient: MicroserviceHttpClient,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ─── Cálculo de matching ───────────────────────────────────────────────────

  async calculateForApplication(
    studentId: string,
    projectId: string,
  ): Promise<number> {
    const result = await this.calculateAndStore(studentId, projectId);
    return result.overallScore;
  }

  async calculateAndStore(
    studentId: string,
    projectId: string,
  ): Promise<MatchResult> {
    const [student, project, weights] = await Promise.all([
      this.fetchStudentData(studentId),
      this.fetchProjectData(projectId),
      this.getActiveWeights(),
    ]);

    const factorScores = await this.computeFactorScores(student, project);
    const overallScore = this.computeOverallScore(factorScores, weights);
    const compatibilityLevel = this.getCompatibilityLevel(overallScore);
    const weightsSnapshot = this.buildWeightsSnapshot(weights);
    const skillsBreakdown = this.buildSkillsBreakdown(student.skills, project.skills);

    // Los factores se calculan en escala 0-1; se persisten en 0-100, igual que overallScore.
    const skillsScore = round2(factorScores[MatchFactor.SKILLS_MATCH] * 100);
    const proficiencyScore = round2(factorScores[MatchFactor.PROFICIENCY_MATCH] * 100);
    const programScore = round2(factorScores[MatchFactor.PROGRAM_MATCH] * 100);
    const semesterScore = round2(factorScores[MatchFactor.SEMESTER_MATCH] * 100);
    const availabilityScore = round2(factorScores[MatchFactor.AVAILABILITY_MATCH] * 100);
    const languageScore = round2(factorScores[MatchFactor.LANGUAGE_MATCH] * 100);

    const existing = await this.resultRepo.findOne({
      where: { studentId, projectId },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expira en 7 días

    if (existing) {
      existing.overallScore = overallScore;
      existing.skillsScore = skillsScore;
      existing.proficiencyScore = proficiencyScore;
      existing.programScore = programScore;
      existing.semesterScore = semesterScore;
      existing.availabilityScore = availabilityScore;
      existing.languageScore = languageScore;
      existing.skillsBreakdown = skillsBreakdown;
      existing.weightsSnapshot = weightsSnapshot;
      existing.compatibilityLevel = compatibilityLevel;
      existing.isRecommended = overallScore >= RECOMMENDED_THRESHOLD;
      existing.calculatedAt = new Date();
      existing.expiresAt = expiresAt;
      const saved = await this.resultRepo.save(existing);
      await this.createRecommendationsIfNeeded(saved, student, project);
      return saved;
    }

    const result = this.resultRepo.create({
      studentId,
      projectId,
      overallScore,
      skillsScore,
      proficiencyScore,
      programScore,
      semesterScore,
      availabilityScore,
      languageScore,
      skillsBreakdown,
      weightsSnapshot,
      compatibilityLevel,
      isRecommended: overallScore >= RECOMMENDED_THRESHOLD,
      expiresAt,
    });

    const saved = await this.resultRepo.save(result);

    await this.createRecommendationsIfNeeded(saved, student, project);

    await this.eventPublisher.publish(
      'matching.score.calculated',
      {
        matchResultId: saved.id,
        studentId,
        projectId,
        overallScore,
        compatibilityLevel,
        isRecommended: saved.isRecommended,
      },
      'matching-service',
    );

    return saved;
  }

  async batchCalculate(
    dto: BatchCalculateMatchDto,
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    const studentIds = dto.studentIds ?? [];
    if (studentIds.length === 0) {
      this.logger.warn(
        'batchCalculate llamado sin studentIds — no se puede obtener todos los estudiantes sin paginación',
      );
      return { processed: 0, failed: 0 };
    }

    const batchSize = dto.batchSize ?? 100;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const chunk = studentIds.slice(i, i + batchSize);
      const promises = chunk.map((sid) =>
        this.calculateAndStore(sid, dto.projectId)
          .then(() => {
            processed++;
          })
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(
              `Error calculando match para student=${sid}: ${msg}`,
            );
            failed++;
          }),
      );
      await Promise.all(promises);
    }

    return { processed, failed };
  }

  // ─── Resultados ────────────────────────────────────────────────────────────

  async getResultsForStudent(
    studentId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: MatchResult[]; total: number }> {
    const [data, total] = await this.resultRepo.findAndCount({
      where: { studentId },
      order: { overallScore: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getResultsForProject(
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: MatchResult[]; total: number }> {
    const [data, total] = await this.resultRepo.findAndCount({
      where: { projectId },
      order: { overallScore: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async getResultByStudentAndProject(
    studentId: string,
    projectId: string,
  ): Promise<MatchResult> {
    const result = await this.resultRepo.findOne({
      where: { studentId, projectId },
    });
    if (!result) {
      throw new NotFoundException('Resultado de matching no encontrado');
    }
    return result;
  }

  // ─── Pesos ─────────────────────────────────────────────────────────────────

  async getWeights(
    scope: WeightScope = WeightScope.GLOBAL,
    scopeId?: string,
  ): Promise<MatchWeight[]> {
    return this.weightRepo.find({
      where: {
        scope,
        scopeId: scopeId !== undefined ? scopeId : IsNull(),
        isActive: true,
      },
      order: { factorName: 'ASC' },
    });
  }

  async updateWeights(dto: UpdateWeightsDto): Promise<MatchWeight[]> {
    const total = dto.weights.reduce((sum, w) => sum + w.weight, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      throw new BadRequestException(
        `Los pesos deben sumar 1.0. Suma actual: ${total.toFixed(3)}`,
      );
    }

    const results: MatchWeight[] = [];
    for (const item of dto.weights) {
      const existing = await this.weightRepo.findOne({
        where: {
          factorName: item.factorName,
          scope: WeightScope.GLOBAL,
          scopeId: IsNull(),
        },
      });

      if (existing) {
        existing.weight = item.weight;
        results.push(await this.weightRepo.save(existing));
      } else {
        const created = this.weightRepo.create({
          factorName: item.factorName,
          weight: item.weight,
          scope: WeightScope.GLOBAL,
          isActive: true,
        });
        results.push(await this.weightRepo.save(created));
      }
    }
    return results;
  }

  // ─── Recomendaciones ───────────────────────────────────────────────────────

  async getRecommendations(
    userId: string,
    targetType: TargetType,
    query: RecommendationQueryDto,
  ): Promise<{
    data: (MatchRecommendation & { projectTitle: string | null })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.recommendationRepo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.matchResult', 'mr')
      .where('rec.targetUserId = :userId', { userId })
      .andWhere('rec.targetType = :targetType', { targetType })
      .andWhere('rec.isDismissed = false');

    if (query.unseenOnly) {
      qb.andWhere('rec.isSeen = false');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [data, total] = await qb
      .orderBy('rec.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const enriched = await this.enrichWithProjectTitles(data);
    return { data: enriched, total, page, limit };
  }

  /** Adjunta el título del proyecto a cada recomendación — matching-service no lo tiene, project-service sí. */
  private async enrichWithProjectTitles(
    recommendations: MatchRecommendation[],
  ): Promise<(MatchRecommendation & { projectTitle: string | null })[]> {
    const projectIds = [...new Set(recommendations.map((r) => r.matchResult?.projectId).filter(Boolean))];
    if (projectIds.length === 0) {
      return recommendations.map((r) => ({ ...r, projectTitle: null }));
    }

    let titleById = new Map<string, string>();
    try {
      const projects = await this.httpClient.post<{ id: string; title: string }[]>(
        'project',
        '/internal/projects/batch-basic',
        { projectIds },
      );
      titleById = new Map(projects.map((p) => [p.id, p.title]));
    } catch (err) {
      this.logger.warn(`No se pudo enriquecer recomendaciones con títulos de proyecto: ${(err as Error).message}`);
    }

    return recommendations.map((r) => ({
      ...r,
      projectTitle: r.matchResult ? (titleById.get(r.matchResult.projectId) ?? null) : null,
    }));
  }

  async markRecommendationSeen(
    id: string,
    userId: string,
  ): Promise<MatchRecommendation> {
    const rec = await this.recommendationRepo.findOne({
      where: { id, targetUserId: userId },
    });
    if (!rec) throw new NotFoundException('Recomendación no encontrada');
    if (!rec.isSeen) {
      rec.isSeen = true;
      rec.seenAt = new Date();
      await this.recommendationRepo.save(rec);
    }
    return rec;
  }

  async dismissRecommendation(
    id: string,
    userId: string,
  ): Promise<MatchRecommendation> {
    const rec = await this.recommendationRepo.findOne({
      where: { id, targetUserId: userId },
    });
    if (!rec) throw new NotFoundException('Recomendación no encontrada');
    rec.isDismissed = true;
    rec.dismissedAt = new Date();
    return this.recommendationRepo.save(rec);
  }

  // ─── Feedback ──────────────────────────────────────────────────────────────

  async submitFeedback(
    matchResultId: string,
    userId: string,
    dto: SubmitFeedbackDto,
  ): Promise<MatchFeedback> {
    const result = await this.resultRepo.findOne({
      where: { id: matchResultId },
    });
    if (!result)
      throw new NotFoundException('Resultado de matching no encontrado');

    const existing = await this.feedbackRepo.findOne({
      where: { matchResultId, userId },
    });
    if (existing)
      throw new ConflictException('Ya enviaste feedback para este resultado');

    const feedback = this.feedbackRepo.create({
      matchResultId,
      userId,
      feedbackType: dto.feedbackType,
      comment: dto.comment ?? null,
    });
    return this.feedbackRepo.save(feedback);
  }

  // ─── Algoritmo de matching ─────────────────────────────────────────────────

  private async computeFactorScores(
    student: StudentData,
    project: ProjectData,
  ): Promise<Record<MatchFactor, number>> {
    const langReqs = project.requirements.filter((r) => r.type === 'language');

    return {
      [MatchFactor.SKILLS_MATCH]: this.skillsMatchScore(
        student.skills,
        project.skills,
      ),
      [MatchFactor.PROFICIENCY_MATCH]: this.proficiencyMatchScore(
        student.skills,
        project.skills,
      ),
      [MatchFactor.PROGRAM_MATCH]: await this.programMatchScore(
        student.program,
        student.programId ?? null,
        project.academicPrograms,
      ),
      [MatchFactor.SEMESTER_MATCH]:
        student.semester >= (project.minimumSemester ?? 1) ? 1.0 : 0.0,
      [MatchFactor.AVAILABILITY_MATCH]: this.availabilityScore(
        student.availability,
        project.locationType,
      ),
      [MatchFactor.LANGUAGE_MATCH]: this.languageMatchScore(
        student.languages,
        langReqs,
      ),
    };
  }

  private computeOverallScore(
    factorScores: Record<MatchFactor, number>,
    weights: MatchWeight[],
  ): number {
    const weightMap = this.buildWeightMap(weights);
    let total = 0;
    for (const factor of Object.values(MatchFactor)) {
      total +=
        (weightMap[factor] ?? DEFAULT_WEIGHTS[factor]) * factorScores[factor];
    }
    return Math.round(total * 100 * 100) / 100;
  }

  /** Empareja una skill de estudiante contra una del proyecto: por catalogSkillId si ambas lo tienen, si no por nombre normalizado. */
  private skillMatches(studentSkill: StudentSkill, projectSkill: ProjectSkill): boolean {
    if (studentSkill.catalogSkillId && projectSkill.catalogSkillId) {
      return studentSkill.catalogSkillId === projectSkill.catalogSkillId;
    }
    return normalizeSkillName(studentSkill.name) === normalizeSkillName(projectSkill.name);
  }

  /**
   * project-service exige >=1 skill antes de aceptar un proyecto a revisión (`pending_approval`)
   * y solo admin puede pasarlo a `published` — un proyecto publicado real SIEMPRE tiene skills.
   * `projectSkills.length === 0` aquí solo puede darse con datos legacy/corruptos (draft viejo,
   * seed inconsistente): no es "sin requisitos" legítimo, así que NO se premia con 1.0 — se
   * trata como ausencia de datos y se puntúa 0, documentado explícitamente vía warning.
   */
  private skillsMatchScore(
    studentSkills: StudentSkill[],
    projectSkills: ProjectSkill[],
  ): number {
    if (projectSkills.length === 0) {
      this.logger.warn(
        'skillsMatchScore: proyecto sin skills — dato inconsistente (project-service exige >=1 skill para publicar). Score 0, no neutral.',
      );
      return 0;
    }
    const mandatory = projectSkills.filter((s) => s.isMandatory);
    const target = mandatory.length > 0 ? mandatory : projectSkills;
    const matched = target.filter((ps) =>
      studentSkills.some((ss) => this.skillMatches(ss, ps)),
    ).length;
    return matched / target.length;
  }

  private proficiencyMatchScore(
    studentSkills: StudentSkill[],
    projectSkills: ProjectSkill[],
  ): number {
    // Mismo razonamiento que skillsMatchScore: proyecto sin skills es dato inconsistente, no "sin requisito".
    if (projectSkills.length === 0) return 0;
    const withLevel = projectSkills.filter((s) => s.proficiencyLevel);
    if (withLevel.length === 0) return 1.0;

    const scores = withLevel.map((ps) => {
      const studentSkill = studentSkills.find((ss) => this.skillMatches(ss, ps));
      if (!studentSkill) return 0;
      return Math.min(
        PROFICIENCY_RANK[studentSkill.proficiencyLevel] / PROFICIENCY_RANK[ps.proficiencyLevel!],
        1,
      );
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private async programMatchScore(
    studentProgram: string,
    studentProgramId: string | null,
    projectProgramIds: string[] | undefined,
  ): Promise<number> {
    if (!projectProgramIds || projectProgramIds.length === 0) return 1.0;

    // Comparación directa por UUID cuando el estudiante ya tiene programId resuelto —
    // determinística, sin ambigüedad de substring. Fuente de verdad preferida.
    if (studentProgramId) {
      return projectProgramIds.includes(studentProgramId) ? 1.0 : 0.0;
    }

    if (!studentProgram) return 0.0;

    // Mismo criterio que fetchStudentData/fetchProjectData (decisión de negocio FASE 1): un fallo de
    // red hacia un servicio dependiente NUNCA se traduce en un score inventado (ni neutral ni alto/bajo).
    // admin-service es dependencia real de este cálculo cuando se necesita resolver programa por nombre.
    let programNames: string[] = [];
    try {
      programNames = (
        await this.httpClient.get<{ id: string; name: string }[]>(
          'admin',
          `/internal/admin/programs/by-ids?ids=${projectProgramIds.join(',')}`,
        )
      ).map((p) => p.name);
    } catch (err) {
      this.logger.error(`No se pudo resolver programas académicos del proyecto: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'admin-service no disponible: no se puede calcular matching sin resolver el programa académico del proyecto',
      );
    }

    const normStudentProgram = studentProgram.toLowerCase().trim();
    const matched = programNames.some((name) => {
      const normProjectProgram = name.toLowerCase().trim();
      return (
        normProjectProgram === normStudentProgram ||
        normStudentProgram.includes(normProjectProgram) ||
        normProjectProgram.includes(normStudentProgram)
      );
    });
    return matched ? 1.0 : 0.0;
  }

  private availabilityScore(
    studentAvailability: string | undefined,
    projectLocationType: string | undefined,
  ): number {
    if (!studentAvailability || !projectLocationType) return 0.7;
    if (
      studentAvailability.toLowerCase() === 'flexible' ||
      projectLocationType.toLowerCase() === 'remote'
    )
      return 1.0;
    if (studentAvailability.toLowerCase() === projectLocationType.toLowerCase())
      return 1.0;
    return 0.3;
  }

  /** Desglose explicable de skills: coincidentes (con nivel estudiante/requerido), faltantes y extra del estudiante. */
  private buildSkillsBreakdown(
    studentSkills: StudentSkill[],
    projectSkills: ProjectSkill[],
  ): SkillsBreakdown {
    const matched: SkillsBreakdown['matched'] = [];
    const missing: SkillsBreakdown['missing'] = [];

    for (const ps of projectSkills) {
      const studentSkill = studentSkills.find((ss) => this.skillMatches(ss, ps));
      const entry = {
        name: ps.name,
        catalogSkillId: ps.catalogSkillId,
        requiredLevel: ps.proficiencyLevel,
        studentLevel: studentSkill?.proficiencyLevel ?? null,
      };
      if (studentSkill) matched.push(entry);
      else missing.push(entry);
    }

    const matchedStudentNames = new Set(
      projectSkills
        .filter((ps) => studentSkills.some((ss) => this.skillMatches(ss, ps)))
        .flatMap((ps) => studentSkills.filter((ss) => this.skillMatches(ss, ps)).map((ss) => normalizeSkillName(ss.name))),
    );
    const extra = studentSkills
      .filter((ss) => !matchedStudentNames.has(normalizeSkillName(ss.name)))
      .map((ss) => ({
        name: ss.name,
        catalogSkillId: ss.catalogSkillId,
        studentLevel: ss.proficiencyLevel,
      }));

    return { matched, missing, extra };
  }

  private languageMatchScore(
    studentLanguages: StudentLanguage[],
    requirements: ProjectRequirement[],
  ): number {
    if (requirements.length === 0) return 1.0;
    const studentLangNames = new Set(
      studentLanguages.map((l) => l.language.toLowerCase()),
    );
    const matched = requirements.filter((r) =>
      studentLangNames.has(r.name.toLowerCase()),
    ).length;
    return matched / requirements.length;
  }

  private getCompatibilityLevel(score: number): CompatibilityLevel {
    if (score >= 70) return CompatibilityLevel.HIGH;
    if (score >= 40) return CompatibilityLevel.MEDIUM;
    return CompatibilityLevel.LOW;
  }

  // ─── Helpers internos ──────────────────────────────────────────────────────

  private async getActiveWeights(): Promise<MatchWeight[]> {
    const weights = await this.weightRepo.find({
      where: { scope: WeightScope.GLOBAL, isActive: true },
    });
    return weights;
  }

  private buildWeightMap(weights: MatchWeight[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const w of weights) {
      map[w.factorName] = Number(w.weight);
    }
    return map;
  }

  private buildWeightsSnapshot(weights: MatchWeight[]): Record<string, number> {
    const snapshot: Record<string, number> = { ...DEFAULT_WEIGHTS };
    for (const w of weights) {
      snapshot[w.factorName] = Number(w.weight);
    }
    return snapshot;
  }

  private async createRecommendationsIfNeeded(
    result: MatchResult,
    student: StudentData,
    project: ProjectData,
  ): Promise<void> {
    if (!result.isRecommended) return;

    const message = `Compatibilidad del ${result.overallScore}% entre el estudiante y el proyecto "${project.title}"`;

    const existingStudent = await this.recommendationRepo.findOne({
      where: {
        matchResultId: result.id,
        targetType: TargetType.STUDENT,
      },
    });

    if (!existingStudent) {
      await this.recommendationRepo.save(
        this.recommendationRepo.create({
          matchResultId: result.id,
          targetUserId: student.userId,
          targetType: TargetType.STUDENT,
          recommendationType: RecommendationType.PROJECT_FOR_STUDENT,
          message,
        }),
      );
    }
  }

  /**
   * Un fallo de red al obtener datos reales NUNCA debe traducirse en un score inventado
   * (ni alto ni bajo) — se relanza como error explícito para que el caller lo maneje
   * como falla de dependencia, no como resultado de negocio.
   */
  private async fetchStudentData(studentId: string): Promise<StudentData> {
    try {
      return await this.httpClient.get<StudentData>(
        'student',
        `/internal/students/${studentId}/matching-data`,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo obtener datos del estudiante ${studentId}: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        `student-service no disponible: no se puede calcular matching sin datos reales del estudiante`,
      );
    }
  }

  private async fetchProjectData(projectId: string): Promise<ProjectData> {
    try {
      return await this.httpClient.get<ProjectData>(
        'project',
        `/internal/projects/${projectId}/matching-data`,
      );
    } catch (err) {
      this.logger.error(
        `No se pudo obtener datos del proyecto ${projectId}: ${(err as Error).message}`,
      );
      throw new ServiceUnavailableException(
        `project-service no disponible: no se puede calcular matching sin datos reales del proyecto`,
      );
    }
  }
}

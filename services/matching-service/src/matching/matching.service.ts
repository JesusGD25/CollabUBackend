import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { MicroserviceHttpClient, EventPublisher } from '@collab-u/shared';
import { MatchWeight } from './entities/match-weight.entity';
import { MatchResult } from './entities/match-result.entity';
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

// Interfaces para datos externos
interface StudentSkill {
  name: string;
  level: number; // 1-5
}

interface StudentLanguage {
  name: string;
  level: string;
}

interface StudentExperience {
  years: number;
}

interface StudentData {
  id: string;
  userId: string;
  program: string;
  faculty?: string;
  semester: number;
  availability?: string; // 'full_time' | 'part_time' | 'flexible'
  skills: StudentSkill[];
  languages: StudentLanguage[];
  experiences: StudentExperience[];
}

interface ProjectRequirement {
  type: 'skill' | 'language';
  name: string;
  minimumLevel?: number;
  isRequired: boolean;
}

interface ProjectData {
  id: string;
  title: string;
  academicProgram?: string;
  faculty?: string;
  minimumSemester?: number;
  locationType?: string; // 'remote' | 'on_site' | 'hybrid'
  requirements: ProjectRequirement[];
  desiredExperienceYears?: number;
}

const DEFAULT_WEIGHTS: Record<MatchFactor, number> = {
  [MatchFactor.SKILLS_MATCH]: 0.35,
  [MatchFactor.PROFICIENCY_MATCH]: 0.15,
  [MatchFactor.PROGRAM_MATCH]: 0.15,
  [MatchFactor.SEMESTER_MATCH]: 0.1,
  [MatchFactor.AVAILABILITY_MATCH]: 0.1,
  [MatchFactor.EXPERIENCE_MATCH]: 0.1,
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

    const factorScores = this.computeFactorScores(student, project);
    const overallScore = this.computeOverallScore(factorScores, weights);
    const compatibilityLevel = this.getCompatibilityLevel(overallScore);
    const weightsSnapshot = this.buildWeightsSnapshot(weights);

    const existing = await this.resultRepo.findOne({
      where: { studentId, projectId },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // expira en 7 días

    if (existing) {
      existing.overallScore = overallScore;
      existing.skillsScore = factorScores[MatchFactor.SKILLS_MATCH];
      existing.proficiencyScore = factorScores[MatchFactor.PROFICIENCY_MATCH];
      existing.programScore = factorScores[MatchFactor.PROGRAM_MATCH];
      existing.semesterScore = factorScores[MatchFactor.SEMESTER_MATCH];
      existing.availabilityScore = factorScores[MatchFactor.AVAILABILITY_MATCH];
      existing.experienceScore = factorScores[MatchFactor.EXPERIENCE_MATCH];
      existing.languageScore = factorScores[MatchFactor.LANGUAGE_MATCH];
      existing.weightsSnapshot = weightsSnapshot;
      existing.compatibilityLevel = compatibilityLevel;
      existing.isRecommended = overallScore >= 70;
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
      skillsScore: factorScores[MatchFactor.SKILLS_MATCH],
      proficiencyScore: factorScores[MatchFactor.PROFICIENCY_MATCH],
      programScore: factorScores[MatchFactor.PROGRAM_MATCH],
      semesterScore: factorScores[MatchFactor.SEMESTER_MATCH],
      availabilityScore: factorScores[MatchFactor.AVAILABILITY_MATCH],
      experienceScore: factorScores[MatchFactor.EXPERIENCE_MATCH],
      languageScore: factorScores[MatchFactor.LANGUAGE_MATCH],
      weightsSnapshot,
      compatibilityLevel,
      isRecommended: overallScore >= 70,
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
  ): Promise<{ data: MatchRecommendation[]; total: number }> {
    const qb = this.recommendationRepo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.matchResult', 'mr')
      .where('rec.target_user_id = :userId', { userId })
      .andWhere('rec.target_type = :targetType', { targetType })
      .andWhere('rec.is_dismissed = false');

    if (query.unseenOnly) {
      qb.andWhere('rec.is_seen = false');
    }

    const [data, total] = await qb
      .orderBy('rec.created_at', 'DESC')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 20))
      .take(query.limit ?? 20)
      .getManyAndCount();

    return { data, total };
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

  private computeFactorScores(
    student: StudentData,
    project: ProjectData,
  ): Record<MatchFactor, number> {
    const skillReqs = project.requirements.filter((r) => r.type === 'skill');
    const langReqs = project.requirements.filter((r) => r.type === 'language');

    return {
      [MatchFactor.SKILLS_MATCH]: this.skillsMatchScore(
        student.skills,
        skillReqs,
      ),
      [MatchFactor.PROFICIENCY_MATCH]: this.proficiencyMatchScore(
        student.skills,
        skillReqs,
      ),
      [MatchFactor.PROGRAM_MATCH]: this.programMatchScore(
        student.program,
        student.faculty,
        project.academicProgram,
        project.faculty,
      ),
      [MatchFactor.SEMESTER_MATCH]:
        student.semester >= (project.minimumSemester ?? 1) ? 1.0 : 0.0,
      [MatchFactor.AVAILABILITY_MATCH]: this.availabilityScore(
        student.availability,
        project.locationType,
      ),
      [MatchFactor.EXPERIENCE_MATCH]: this.experienceScore(
        student.experiences,
        project.desiredExperienceYears,
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

  private skillsMatchScore(
    studentSkills: StudentSkill[],
    requirements: ProjectRequirement[],
  ): number {
    if (requirements.length === 0) return 1.0;
    const required = requirements.filter((r) => r.isRequired);
    const target = required.length > 0 ? required : requirements;
    const studentSkillNames = new Set(
      studentSkills.map((s) => s.name.toLowerCase()),
    );
    const matched = target.filter((r) =>
      studentSkillNames.has(r.name.toLowerCase()),
    ).length;
    return matched / target.length;
  }

  private proficiencyMatchScore(
    studentSkills: StudentSkill[],
    requirements: ProjectRequirement[],
  ): number {
    if (requirements.length === 0) return 1.0;
    const reqsWithLevel = requirements.filter(
      (r) => r.minimumLevel !== undefined,
    );
    if (reqsWithLevel.length === 0) return 1.0;

    const scores = reqsWithLevel.map((req) => {
      const studentSkill = studentSkills.find(
        (s) => s.name.toLowerCase() === req.name.toLowerCase(),
      );
      if (!studentSkill) return 0;
      return Math.min(studentSkill.level / req.minimumLevel!, 1);
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private programMatchScore(
    studentProgram: string,
    studentFaculty: string | undefined,
    projectProgram: string | undefined,
    projectFaculty: string | undefined,
  ): number {
    if (!projectProgram) return 1.0;
    if (studentProgram?.toLowerCase() === projectProgram.toLowerCase())
      return 1.0;
    if (
      studentFaculty &&
      projectFaculty &&
      studentFaculty.toLowerCase() === projectFaculty.toLowerCase()
    )
      return 0.5;
    return 0.0;
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

  private experienceScore(
    experiences: StudentExperience[],
    desiredYears: number | undefined,
  ): number {
    if (!desiredYears || desiredYears === 0) return 1.0;
    const totalYears = experiences.reduce((acc, e) => acc + (e.years ?? 0), 0);
    return Math.min(totalYears / desiredYears, 1);
  }

  private languageMatchScore(
    studentLanguages: StudentLanguage[],
    requirements: ProjectRequirement[],
  ): number {
    if (requirements.length === 0) return 1.0;
    const studentLangNames = new Set(
      studentLanguages.map((l) => l.name.toLowerCase()),
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

  private async fetchStudentData(studentId: string): Promise<StudentData> {
    try {
      const response = await this.httpClient.get<{ data: StudentData }>(
        'student',
        `/internal/students/${studentId}/matching-data`,
      );
      return response.data;
    } catch {
      this.logger.warn(
        `No se pudo obtener datos del estudiante ${studentId}, usando datos vacíos`,
      );
      return {
        id: studentId,
        userId: studentId,
        program: '',
        semester: 1,
        skills: [],
        languages: [],
        experiences: [],
      };
    }
  }

  private async fetchProjectData(projectId: string): Promise<ProjectData> {
    try {
      const response = await this.httpClient.get<{ data: ProjectData }>(
        'project',
        `/internal/projects/${projectId}/matching-data`,
      );
      return response.data;
    } catch {
      this.logger.warn(
        `No se pudo obtener datos del proyecto ${projectId}, usando datos vacíos`,
      );
      return {
        id: projectId,
        title: 'Proyecto',
        requirements: [],
      };
    }
  }
}

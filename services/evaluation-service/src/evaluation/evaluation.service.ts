import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Evaluation } from './entities/evaluation.entity';
import { EvaluationCriteria } from './entities/evaluation-criteria.entity';
import { EvaluationRating } from './entities/evaluation-rating.entity';
import { EvaluationTemplate } from './entities/evaluation-template.entity';
import { EvaluationStatus, EvaluationType, RatingScale, CriterionCategory } from './entities/enums';

import {
  CreateEvaluationDto,
  SubmitEvaluationDto,
  CreateCriterionDto,
  UpdateCriterionDto,
  CreateTemplateDto,
  UpdateTemplateDto,
  EvaluationQueryDto,
} from './dto';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class EvaluationService implements OnModuleInit {
  private readonly logger = new Logger(EvaluationService.name);

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureDefaultCriteria();
    } catch (err) {
      this.logger.warn(`No se pudieron sembrar criterios por defecto: ${(err as Error).message}`);
    }
  }

  /**
   * Siembra idempotente de criterios genéricos para cada tipo de evaluación.
   * Si ya existe al menos UN criterio activo para un tipo, no toca ese tipo
   * (respeta configuraciones manuales del admin). Escala 1-5 estrellas.
   */
  private async ensureDefaultCriteria(): Promise<void> {
    const defaults: Record<EvaluationType, Array<{
      name: string;
      description: string;
      category: CriterionCategory;
    }>> = {
      [EvaluationType.COMPANY_EVALUATES_STUDENT]: [
        { name: 'Calidad técnica del trabajo entregado',
          description: 'Nivel técnico, corrección y solidez de los entregables producidos por el estudiante.',
          category: CriterionCategory.TECHNICAL },
        { name: 'Cumplimiento de plazos y compromisos',
          description: 'Entrega dentro de las fechas acordadas y respeto de los compromisos asumidos.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Comunicación y trabajo en equipo',
          description: 'Claridad al comunicarse, apertura al feedback y colaboración con el equipo.',
          category: CriterionCategory.SOFT_SKILLS },
        { name: 'Autonomía e iniciativa',
          description: 'Capacidad de avanzar sin supervisión constante y proponer mejoras.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Actitud y disposición al aprendizaje',
          description: 'Motivación, receptividad ante nuevos retos y aprendizaje continuo.',
          category: CriterionCategory.SOFT_SKILLS },
      ],
      [EvaluationType.STUDENT_EVALUATES_COMPANY]: [
        { name: 'Claridad de objetivos y alcance del proyecto',
          description: 'La empresa definió con claridad qué se esperaba lograr.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Acompañamiento y disponibilidad del equipo',
          description: 'El personal de la empresa estuvo disponible y acompañó el proceso.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Herramientas y recursos disponibles',
          description: 'Se facilitaron las herramientas, accesos y recursos necesarios para trabajar.',
          category: CriterionCategory.GENERAL },
        { name: 'Ambiente de trabajo',
          description: 'El entorno laboral fue respetuoso, inclusivo y motivador.',
          category: CriterionCategory.SOFT_SKILLS },
        { name: 'Aprendizaje profesional adquirido',
          description: 'La experiencia aportó al crecimiento profesional del estudiante.',
          category: CriterionCategory.PROFESSIONAL },
      ],
      [EvaluationType.SUPERVISOR_EVALUATES_STUDENT]: [
        { name: 'Rigor académico del trabajo',
          description: 'Solidez metodológica, referencias y profundidad del análisis.',
          category: CriterionCategory.ACADEMIC },
        { name: 'Aplicación de conceptos aprendidos',
          description: 'Uso apropiado de los conocimientos adquiridos durante la carrera.',
          category: CriterionCategory.ACADEMIC },
        { name: 'Calidad del anteproyecto y entregables',
          description: 'Estructura, claridad y calidad técnica de los documentos producidos.',
          category: CriterionCategory.TECHNICAL },
        { name: 'Autonomía y disciplina',
          description: 'Manejo del tiempo, avance sostenido y responsabilidad académica.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Contribución al proyecto y al aprendizaje propio',
          description: 'Aporte real al proyecto y crecimiento personal-académico observado.',
          category: CriterionCategory.ACADEMIC },
      ],
      [EvaluationType.STUDENT_EVALUATES_SUPERVISOR]: [
        { name: 'Disponibilidad y respuesta oportuna',
          description: 'El asesor respondió en tiempos razonables y estuvo accesible.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Calidad de la retroalimentación',
          description: 'Los comentarios y correcciones fueron claros, útiles y accionables.',
          category: CriterionCategory.ACADEMIC },
        { name: 'Conocimiento del área temática',
          description: 'Dominio del tema del proyecto por parte del asesor.',
          category: CriterionCategory.ACADEMIC },
        { name: 'Guía en el proceso académico',
          description: 'Orientación en anteproyecto, entregables y cierre del proceso.',
          category: CriterionCategory.PROFESSIONAL },
        { name: 'Motivación y apoyo',
          description: 'Actitud alentadora, respeto y apoyo durante todo el proyecto.',
          category: CriterionCategory.SOFT_SKILLS },
      ],
      [EvaluationType.SELF_EVALUATION]: [
        { name: 'Cumplimiento de objetivos personales',
          description: 'Grado en que alcanzaste las metas propuestas al iniciar.',
          category: CriterionCategory.GENERAL },
        { name: 'Aprendizajes adquiridos',
          description: 'Conocimientos, habilidades y actitudes nuevas incorporadas.',
          category: CriterionCategory.GENERAL },
        { name: 'Áreas de mejora identificadas',
          description: 'Consciencia de puntos débiles y plan de mejora.',
          category: CriterionCategory.GENERAL },
      ],
    };

    for (const [type, list] of Object.entries(defaults) as [EvaluationType, typeof defaults[EvaluationType]][]) {
      const existing = await this.criteriaRepo.count({
        where: { evaluationType: type, isActive: true },
      });
      if (existing > 0) continue;

      const entities = list.map((item, index) =>
        this.criteriaRepo.create({
          name: item.name,
          description: item.description,
          category: item.category,
          evaluationType: type,
          weight: 1,
          ratingScale: RatingScale.ONE_TO_FIVE,
          isRequired: true,
          isActive: true,
          displayOrder: index,
        }),
      );
      await this.criteriaRepo.save(entities);
      this.logger.log(`Sembrados ${entities.length} criterios por defecto para ${type}`);
    }
  }

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
    @InjectRepository(EvaluationCriteria)
    private readonly criteriaRepo: Repository<EvaluationCriteria>,
    @InjectRepository(EvaluationRating)
    private readonly ratingRepo: Repository<EvaluationRating>,
    @InjectRepository(EvaluationTemplate)
    private readonly templateRepo: Repository<EvaluationTemplate>,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // EVALUACIONES
  // ──────────────────────────────────────────────────────────────────

  /**
   * Genera automáticamente las evaluaciones pendientes cuando un proyecto
   * pasa al estado COMPLETED. Idempotente: si una evaluación ya existe para
   * (application, evaluator, evaluatedType) no la vuelve a crear.
   *
   * Pares creados según los participantes disponibles:
   *   empresa   → estudiante   (COMPANY_EVALUATES_STUDENT)
   *   estudiante → empresa     (STUDENT_EVALUATES_COMPANY)
   *   asesor    → estudiante   (SUPERVISOR_EVALUATES_STUDENT)
   *   estudiante → asesor      (STUDENT_EVALUATES_SUPERVISOR)
   */
  async createEvaluationsForCompletedProject(input: {
    applicationId: string;
    projectId: string;
    projectTitle?: string | null;
    studentId: string;
    companyUserId?: string | null;
    asesorUserId?: string | null;
  }): Promise<Evaluation[]> {
    const pairs: { evaluatorId: string | null | undefined; evaluatedId: string; type: EvaluationType }[] = [
      { evaluatorId: input.companyUserId, evaluatedId: input.studentId, type: EvaluationType.COMPANY_EVALUATES_STUDENT },
      { evaluatorId: input.studentId, evaluatedId: input.companyUserId!, type: EvaluationType.STUDENT_EVALUATES_COMPANY },
      { evaluatorId: input.asesorUserId, evaluatedId: input.studentId, type: EvaluationType.SUPERVISOR_EVALUATES_STUDENT },
      { evaluatorId: input.studentId, evaluatedId: input.asesorUserId!, type: EvaluationType.STUDENT_EVALUATES_SUPERVISOR },
    ];

    const created: Evaluation[] = [];

    for (const pair of pairs) {
      if (!pair.evaluatorId || !pair.evaluatedId) continue;

      const existing = await this.evaluationRepo.findOne({
        where: {
          applicationId: input.applicationId,
          evaluatorId: pair.evaluatorId,
          evaluationType: pair.type,
        },
      });
      if (existing) continue;

      const evaluation = this.evaluationRepo.create({
        applicationId: input.applicationId,
        projectId: input.projectId,
        evaluatorId: pair.evaluatorId,
        evaluatedId: pair.evaluatedId,
        evaluationType: pair.type,
        status: EvaluationStatus.PENDING,
        isAnonymous: false,
        dueDate: null,
        templateId: null,
      });

      const saved = await this.evaluationRepo.save(evaluation);
      created.push(saved);

      try {
        await this.eventPublisher.publish(
          'evaluation.created',
          {
            evaluationId: saved.id,
            applicationId: saved.applicationId,
            projectId: saved.projectId,
            projectTitle: input.projectTitle ?? null,
            evaluatorId: saved.evaluatorId,
            evaluatedId: saved.evaluatedId,
            evaluationType: saved.evaluationType,
          },
          'evaluation-service',
        );
      } catch (err) {
        this.logger.warn(`No se pudo publicar evaluation.created para ${saved.id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(
      `Auto-generadas ${created.length} evaluación(es) para application ${input.applicationId}`,
    );
    return created;
  }

  async createEvaluation(
    evaluatorId: string,
    dto: CreateEvaluationDto,
  ): Promise<Evaluation> {
    const existing = await this.evaluationRepo.findOne({
      where: {
        applicationId: dto.applicationId,
        evaluatorId,
        evaluationType: dto.evaluationType,
      },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe una evaluación de este tipo para esta postulación',
      );
    }

    await this.assertAcademicProcessCompleted(dto.evaluationType, dto.applicationId);

    const evaluation = this.evaluationRepo.create({
      applicationId: dto.applicationId,
      projectId: dto.projectId,
      evaluatorId,
      evaluatedId: dto.evaluatedId,
      evaluationType: dto.evaluationType,
      status: EvaluationStatus.PENDING,
      isAnonymous: dto.isAnonymous ?? false,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      templateId: dto.templateId ?? null,
    });

    const projectInfo = await this.httpClient
      .get<{ id: string; title: string }>(`project`, `/internal/projects/${dto.projectId}/exists`)
      .catch(() => null);

    const saved = await this.evaluationRepo.save(evaluation);

    await this.eventPublisher.publish(
      'evaluation.created',
      {
        evaluationId: saved.id,
        applicationId: saved.applicationId,
        projectId: saved.projectId,
        projectTitle: projectInfo?.title ?? null,
        evaluatorId: saved.evaluatorId,
        evaluatedId: saved.evaluatedId,
        evaluationType: saved.evaluationType,
      },
      'evaluation-service',
    );

    return saved;
  }

  /**
   * Regla de negocio: las evaluaciones bidireccionales del flujo académico
   * (empresa↔estudiante, estudiante→asesor) solo se habilitan cuando el
   * registro académico de la postulación está en estado "completed".
   */
  private async assertAcademicProcessCompleted(evaluationType: EvaluationType, applicationId: string): Promise<void> {
    const gatedTypes = [
      EvaluationType.COMPANY_EVALUATES_STUDENT,
      EvaluationType.STUDENT_EVALUATES_COMPANY,
      EvaluationType.STUDENT_EVALUATES_SUPERVISOR,
    ];
    if (!gatedTypes.includes(evaluationType)) return;

    let status: string | null = null;
    try {
      const result = await this.httpClient.get<{ status: string | null }>(
        'application',
        `/internal/applications/${applicationId}/academic-record-status`,
      );
      status = result.status;
    } catch (err: any) {
      this.logger.warn(`No se pudo verificar el estado académico de ${applicationId}: ${err.message}`);
      throw new BadRequestException('No se pudo verificar que el proyecto esté completado');
    }

    if (status !== 'completed') {
      throw new BadRequestException(
        'Las evaluaciones solo se habilitan cuando el proyecto académico está completado',
      );
    }
  }

  async submitEvaluation(
    id: string,
    evaluatorId: string,
    dto: SubmitEvaluationDto,
  ): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findOne({ where: { id } });

    if (!evaluation) {
      throw new NotFoundException(`Evaluación ${id} no encontrada`);
    }

    if (evaluation.evaluatorId !== evaluatorId) {
      throw new ForbiddenException('No puedes completar una evaluación que no es tuya');
    }

    if (evaluation.status === EvaluationStatus.COMPLETED) {
      throw new ConflictException('Esta evaluación ya fue completada');
    }

    if (evaluation.status === EvaluationStatus.EXPIRED) {
      throw new BadRequestException('Esta evaluación ha expirado');
    }

    // Upsert ratings
    for (const ratingDto of dto.ratings) {
      const existingRating = await this.ratingRepo.findOne({
        where: { evaluationId: id, criterionId: ratingDto.criterionId },
      });

      if (existingRating) {
        existingRating.score = ratingDto.score;
        existingRating.comment = ratingDto.comment ?? null;
        await this.ratingRepo.save(existingRating);
      } else {
        const rating = this.ratingRepo.create({
          evaluationId: id,
          criterionId: ratingDto.criterionId,
          score: ratingDto.score,
          comment: ratingDto.comment ?? null,
        });
        await this.ratingRepo.save(rating);
      }
    }

    // Calcular overall score como promedio de todos los ratings
    let overallScore: number | null = null;
    
    if (dto.ratings && dto.ratings.length > 0) {
      const allRatings = await this.ratingRepo.find({ where: { evaluationId: id } });
      overallScore = allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + Number(r.score), 0) / allRatings.length
        : null;
    } else if (dto.overallScore !== undefined) {
      overallScore = dto.overallScore;
    }

    evaluation.status = EvaluationStatus.COMPLETED;
    evaluation.overallScore = overallScore;
    evaluation.overallComment = dto.overallComment ?? null;
    evaluation.strengths = dto.strengths ?? null;
    evaluation.areasForImprovement = dto.areasForImprovement ?? null;
    evaluation.completedAt = new Date();

    const projectInfo = await this.httpClient
      .get<{ id: string; title: string }>(`project`, `/internal/projects/${evaluation.projectId}/exists`)
      .catch(() => null);

    const updated = await this.evaluationRepo.save(evaluation);

    await this.eventPublisher.publish(
      'evaluation.completed',
      {
        evaluationId: updated.id,
        applicationId: updated.applicationId,
        projectId: updated.projectId,
        projectTitle: projectInfo?.title ?? null,
        evaluatedId: updated.evaluatedId,
        evaluationType: updated.evaluationType,
        overallScore: updated.overallScore,
      },
      'evaluation-service',
    );

    updated.ratings = await this.ratingRepo.find({ where: { evaluationId: id } });
    await this.enrichEvaluations([updated]);
    return updated;
  }

  /**
   * Llena `projectTitle`/`evaluatorName`/`evaluatedName` — campos que el modelo
   * frontend siempre esperó "enriquecidos por el backend" (ver comentario en
   * `evaluation.model.ts`) pero que ningún método de este servicio llenaba
   * nunca. Batch a project-service y user-service, igual que el patrón ya
   * usado en `application-service/project-access.service.ts`.
   */
  private async enrichEvaluations<T extends Evaluation>(evaluations: T[]): Promise<T[]> {
    if (evaluations.length === 0) return evaluations;

    const projectIds = [...new Set(evaluations.map((e) => e.projectId))];
    const userIds = [...new Set(evaluations.flatMap((e) => [e.evaluatorId, e.evaluatedId]))];

    const [projects, users] = await Promise.all([
      this.httpClient
        .post<{ id: string; title: string }[]>('project', '/internal/projects/batch-basic', { projectIds })
        .catch(() => [] as { id: string; title: string }[]),
      this.httpClient
        .post<{ userId: string; firstName: string | null; lastName: string | null }[]>(
          'user',
          '/internal/users/batch-basic',
          { userIds },
        )
        .catch(() => [] as { userId: string; firstName: string | null; lastName: string | null }[]),
    ]);

    const projectMap = new Map(projects.map((p) => [p.id, p.title]));
    const nameMap = new Map(
      users.map((u) => [u.userId, [u.firstName, u.lastName].filter(Boolean).join(' ') || null]),
    );

    for (const e of evaluations) {
      e.projectTitle = projectMap.get(e.projectId) ?? null;
      e.evaluatorName = nameMap.get(e.evaluatorId) ?? null;
      e.evaluatedName = nameMap.get(e.evaluatedId) ?? null;
    }
    return evaluations;
  }

  async findById(id: string): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findOne({ where: { id } });

    if (!evaluation) {
      throw new NotFoundException(`Evaluación ${id} no encontrada`);
    }

    evaluation.ratings = await this.ratingRepo.find({ where: { evaluationId: id } });
    await this.enrichEvaluations([evaluation]);
    return evaluation;
  }

  async findByApplication(applicationId: string): Promise<Evaluation[]> {
    const evaluations = await this.evaluationRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
    if (evaluations.length === 0) return evaluations;

    const ratings = await this.ratingRepo.find({
      where: { evaluationId: In(evaluations.map((e) => e.id)) },
    });
    const byEvaluation = new Map<string, EvaluationRating[]>();
    for (const r of ratings) {
      if (!byEvaluation.has(r.evaluationId)) byEvaluation.set(r.evaluationId, []);
      byEvaluation.get(r.evaluationId)!.push(r);
    }
    for (const e of evaluations) e.ratings = byEvaluation.get(e.id) ?? [];
    await this.enrichEvaluations(evaluations);
    return evaluations;
  }

  async findByEvaluator(
    evaluatorId: string,
    query: EvaluationQueryDto,
  ): Promise<PaginatedResponse<Evaluation>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Evaluation> = { evaluatorId };
    if (query.evaluationType) where.evaluationType = query.evaluationType;
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;

    const [data, total] = await this.evaluationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    await this.enrichEvaluations(data);
    return { data, total, page, limit };
  }

  async findByEvaluated(
    evaluatedId: string,
    query: EvaluationQueryDto,
  ): Promise<PaginatedResponse<Evaluation>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Evaluation> = { evaluatedId };
    if (query.evaluationType) where.evaluationType = query.evaluationType;
    if (query.status) where.status = query.status;
    if (query.projectId) where.projectId = query.projectId;

    const [data, total] = await this.evaluationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    await this.enrichEvaluations(data);
    return { data, total, page, limit };
  }

  async getAggregateScores(evaluatedId: string): Promise<{
    averageScore: number | null;
    completedCount: number;
    byType: Record<string, number | null>;
  }> {
    const completed = await this.evaluationRepo.find({
      where: { evaluatedId, status: EvaluationStatus.COMPLETED },
    });

    if (completed.length === 0) {
      return { averageScore: null, completedCount: 0, byType: {} };
    }

    const withScore = completed.filter((e) => e.overallScore !== null);
    const averageScore =
      withScore.length > 0
        ? withScore.reduce((sum, e) => sum + Number(e.overallScore), 0) / withScore.length
        : null;

    const byType: Record<string, number | null> = {};
    const types = Object.values(EvaluationType) as EvaluationType[];
    for (const type of types) {
      const typeEvals = completed.filter(
        (e) => e.evaluationType === type && e.overallScore !== null,
      );
      byType[type] =
        typeEvals.length > 0
          ? typeEvals.reduce((sum, e) => sum + Number(e.overallScore), 0) / typeEvals.length
          : null;
    }

    return { averageScore, completedCount: completed.length, byType };
  }

  // ──────────────────────────────────────────────────────────────────
  // CRITERIOS
  // ──────────────────────────────────────────────────────────────────

  async getCriteria(evaluationType?: EvaluationType): Promise<EvaluationCriteria[]> {
    const where: FindOptionsWhere<EvaluationCriteria> = { isActive: true };
    if (evaluationType) where.evaluationType = evaluationType;

    return this.criteriaRepo.find({
      where,
      order: { displayOrder: 'ASC' },
    });
  }

  async createCriterion(dto: CreateCriterionDto): Promise<EvaluationCriteria> {
    const criterion = this.criteriaRepo.create({
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category,
      evaluationType: dto.evaluationType,
      weight: dto.weight ?? 1,
      ratingScale: dto.ratingScale ?? RatingScale.ONE_TO_FIVE,
      isRequired: dto.isRequired ?? true,
      displayOrder: dto.displayOrder ?? 0,
    });

    return this.criteriaRepo.save(criterion);
  }

  // ──────────────────────────────────────────────────────────────────
  // TEMPLATES
  // ──────────────────────────────────────────────────────────────────

  async getTemplates(evaluationType?: EvaluationType): Promise<EvaluationTemplate[]> {
    const where: FindOptionsWhere<EvaluationTemplate> = { isActive: true };
    if (evaluationType) where.evaluationType = evaluationType;

    return this.templateRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async createTemplate(dto: CreateTemplateDto, createdBy?: string): Promise<EvaluationTemplate> {
    const template = this.templateRepo.create({
      name: dto.name,
      evaluationType: dto.evaluationType,
      criteriaIds: dto.criteriaIds,
      description: dto.description ?? null,
      isDefault: dto.isDefault ?? false,
      isActive: true,
      createdBy: createdBy ?? null,
    });
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<EvaluationTemplate> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    await this.templateRepo.remove(template);
  }

  async updateCriterion(id: string, dto: UpdateCriterionDto): Promise<EvaluationCriteria> {
    const criterion = await this.criteriaRepo.findOne({ where: { id } });
    if (!criterion) throw new NotFoundException('Criterio no encontrado');
    Object.assign(criterion, dto);
    return this.criteriaRepo.save(criterion);
  }

  async deleteCriterion(id: string): Promise<void> {
    const criterion = await this.criteriaRepo.findOne({ where: { id } });
    if (!criterion) throw new NotFoundException('Criterio no encontrado');
    await this.criteriaRepo.remove(criterion);
  }

  // ──────────────────────────────────────────────────────────────────
  // SCHEDULED JOBS
  // ──────────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_HOUR)
  async expireEvaluations(): Promise<void> {
    const now = new Date();
    const result = await this.evaluationRepo
      .createQueryBuilder('eval')
      .update(Evaluation)
      .set({ status: EvaluationStatus.EXPIRED })
      .where('status = :pending', { pending: EvaluationStatus.PENDING })
      .andWhere('due_date IS NOT NULL')
      .andWhere('due_date < :now', { now })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Job expiración: ${result.affected} evaluación(es) marcada(s) como expiradas`);
    }
  }
}

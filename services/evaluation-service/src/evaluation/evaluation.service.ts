import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Evaluation } from './entities/evaluation.entity';
import { EvaluationCriteria } from './entities/evaluation-criteria.entity';
import { EvaluationRating } from './entities/evaluation-rating.entity';
import { EvaluationTemplate } from './entities/evaluation-template.entity';
import { EvaluationStatus, EvaluationType, RatingScale } from './entities/enums';

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
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

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

  async submitEvaluation(
    id: string,
    evaluatorId: string,
    dto: SubmitEvaluationDto,
  ): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findOne({
      where: { id },
      relations: ['ratings'],
    });

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

    return updated;
  }

  async findById(id: string): Promise<Evaluation> {
    const evaluation = await this.evaluationRepo.findOne({
      where: { id },
      relations: ['ratings'],
    });

    if (!evaluation) {
      throw new NotFoundException(`Evaluación ${id} no encontrada`);
    }

    return evaluation;
  }

  async findByApplication(applicationId: string): Promise<Evaluation[]> {
    return this.evaluationRepo.find({
      where: { applicationId },
      relations: ['ratings'],
      order: { createdAt: 'ASC' },
    });
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

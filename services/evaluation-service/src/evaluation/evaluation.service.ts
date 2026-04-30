import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';

import { Evaluation } from './entities/evaluation.entity';
import { EvaluationCriteria } from './entities/evaluation-criteria.entity';
import { EvaluationRating } from './entities/evaluation-rating.entity';
import { EvaluationTemplate } from './entities/evaluation-template.entity';
import { EvaluationStatus, EvaluationType, RatingScale } from './entities/enums';

import {
  CreateEvaluationDto,
  SubmitEvaluationDto,
  CreateCriterionDto,
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
    });

    const saved = await this.evaluationRepo.save(evaluation);

    await this.eventPublisher.publish(
      'evaluation.created',
      {
        evaluationId: saved.id,
        applicationId: saved.applicationId,
        projectId: saved.projectId,
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
    const allRatings = await this.ratingRepo.find({ where: { evaluationId: id } });
    const overallScore =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + Number(r.score), 0) / allRatings.length
        : null;

    evaluation.status = EvaluationStatus.COMPLETED;
    evaluation.overallScore = overallScore;
    evaluation.overallComment = dto.overallComment ?? null;
    evaluation.strengths = dto.strengths ?? null;
    evaluation.areasForImprovement = dto.areasForImprovement ?? null;
    evaluation.completedAt = new Date();

    const updated = await this.evaluationRepo.save(evaluation);

    await this.eventPublisher.publish(
      'evaluation.completed',
      {
        evaluationId: updated.id,
        applicationId: updated.applicationId,
        projectId: updated.projectId,
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

  async createTemplate(
    name: string,
    evaluationType: EvaluationType,
    criteriaIds: string[],
    createdBy: string,
  ): Promise<EvaluationTemplate> {
    const template = this.templateRepo.create({
      name,
      evaluationType,
      criteriaIds,
      createdBy,
    });

    return this.templateRepo.save(template);
  }
}

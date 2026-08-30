import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { EvaluationService } from './evaluation.service';
import { Evaluation } from './entities/evaluation.entity';
import { EvaluationCriteria } from './entities/evaluation-criteria.entity';
import { EvaluationRating } from './entities/evaluation-rating.entity';
import { EvaluationTemplate } from './entities/evaluation-template.entity';
import {
  EvaluationStatus,
  EvaluationType,
  CriterionCategory,
  RatingScale,
} from './entities/enums';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { EvaluationQueryDto } from './dto/query-evaluation.dto';

// ──────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────
const EVALUATOR_ID = '11111111-1111-1111-1111-111111111111';
const EVALUATED_ID = '22222222-2222-2222-2222-222222222222';
const APPLICATION_ID = '33333333-3333-3333-3333-333333333333';
const PROJECT_ID = '44444444-4444-4444-4444-444444444444';
const EVAL_ID = '55555555-5555-5555-5555-555555555555';
const CRITERION_ID = '66666666-6666-6666-6666-666666666666';

const makeMockEvaluation = (
  overrides: Partial<Evaluation> = {},
): Evaluation =>
  ({
    id: EVAL_ID,
    applicationId: APPLICATION_ID,
    projectId: PROJECT_ID,
    evaluatorId: EVALUATOR_ID,
    evaluatedId: EVALUATED_ID,
    evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT,
    status: EvaluationStatus.PENDING,
    overallScore: null,
    overallComment: null,
    strengths: null,
    areasForImprovement: null,
    isAnonymous: false,
    dueDate: null,
    completedAt: null,
    templateId: null,
    ratings: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }) as Evaluation;

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

// ──────────────────────────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────────────────────────
describe('EvaluationService', () => {
  let service: EvaluationService;
  let mockEvaluationRepo: ReturnType<typeof createMockRepo>;
  let mockCriteriaRepo: ReturnType<typeof createMockRepo>;
  let mockRatingRepo: ReturnType<typeof createMockRepo>;
  let mockTemplateRepo: ReturnType<typeof createMockRepo>;
  let mockEventPublisher: { publish: jest.Mock };
  let mockHttpClient: { get: jest.Mock; patch: jest.Mock; post: jest.Mock };

  beforeEach(async () => {
    mockEvaluationRepo = createMockRepo();
    mockCriteriaRepo = createMockRepo();
    mockRatingRepo = createMockRepo();
    mockTemplateRepo = createMockRepo();
    mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mockHttpClient = {
      get: jest.fn().mockResolvedValue({ status: 'completed' }),
      patch: jest.fn().mockResolvedValue(null),
      // enrichEvaluations() hace batch-fetch de título de proyecto / nombres de
      // usuario vía post() — por defecto sin resultados, no enriquece nada.
      post: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        { provide: getRepositoryToken(Evaluation), useValue: mockEvaluationRepo },
        { provide: getRepositoryToken(EvaluationCriteria), useValue: mockCriteriaRepo },
        { provide: getRepositoryToken(EvaluationRating), useValue: mockRatingRepo },
        { provide: getRepositoryToken(EvaluationTemplate), useValue: mockTemplateRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
    // findByApplication()/findById() ahora hacen batch-fetch de ratings —
    // por defecto sin ratings; los tests que los necesiten sobreescriben esto.
    mockRatingRepo.find.mockResolvedValue([]);
  });

  afterEach(() => jest.clearAllMocks());

  // ──────────────────────────────────────────────────────────────────
  // createEvaluation
  // ──────────────────────────────────────────────────────────────────
  describe('createEvaluation', () => {
    const dto: CreateEvaluationDto = {
      applicationId: APPLICATION_ID,
      projectId: PROJECT_ID,
      evaluatedId: EVALUATED_ID,
      evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT,
    };

    it('debería crear una evaluación correctamente', async () => {
      const saved = makeMockEvaluation();
      mockEvaluationRepo.findOne.mockResolvedValue(null);
      mockEvaluationRepo.create.mockReturnValue(saved);
      mockEvaluationRepo.save.mockResolvedValue(saved);

      const result = await service.createEvaluation(EVALUATOR_ID, dto);

      expect(result).toBe(saved);
      expect(mockEvaluationRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            applicationId: APPLICATION_ID,
            evaluatorId: EVALUATOR_ID,
            evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT,
          }),
        }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'evaluation.created',
        expect.objectContaining({ evaluationId: EVAL_ID, evaluatedId: EVALUATED_ID }),
        'evaluation-service',
      );
    });

    it('debería lanzar BadRequestException si el proyecto académico no está completado', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(null);
      mockHttpClient.get.mockResolvedValueOnce({ status: 'active' });

      await expect(service.createEvaluation(EVALUATOR_ID, dto)).rejects.toThrow(BadRequestException);
    });

    it('no bloquea self_evaluation aunque el proyecto no esté completado', async () => {
      const saved = makeMockEvaluation();
      mockEvaluationRepo.findOne.mockResolvedValue(null);
      mockEvaluationRepo.create.mockReturnValue(saved);
      mockEvaluationRepo.save.mockResolvedValue(saved);
      mockHttpClient.get.mockResolvedValueOnce({ status: 'active' });

      const result = await service.createEvaluation(EVALUATOR_ID, { ...dto, evaluationType: EvaluationType.SELF_EVALUATION });

      expect(result).toBe(saved);
    });

    it('debería lanzar ConflictException si ya existe una evaluación del mismo tipo', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(makeMockEvaluation());

      await expect(service.createEvaluation(EVALUATOR_ID, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockEvaluationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // submitEvaluation
  // ──────────────────────────────────────────────────────────────────
  describe('submitEvaluation', () => {
    const dto: SubmitEvaluationDto = {
      ratings: [{ criterionId: CRITERION_ID, score: 80 }],
      overallComment: 'Buen desempeño',
    };

    it('debería completar la evaluación y calcular el overallScore', async () => {
      const evaluation = makeMockEvaluation();
      const savedRating = { id: 'r1', evaluationId: EVAL_ID, criterionId: CRITERION_ID, score: 80, comment: null };
      const completed = makeMockEvaluation({ status: EvaluationStatus.COMPLETED, overallScore: 80, completedAt: new Date() });

      mockEvaluationRepo.findOne.mockResolvedValue(evaluation);
      mockRatingRepo.findOne.mockResolvedValue(null);
      mockRatingRepo.create.mockReturnValue(savedRating);
      mockRatingRepo.save.mockResolvedValue(savedRating);
      mockRatingRepo.find.mockResolvedValue([{ score: 80 }]);
      mockEvaluationRepo.save.mockResolvedValue(completed);

      const result = await service.submitEvaluation(EVAL_ID, EVALUATOR_ID, dto);

      expect(result.status).toBe(EvaluationStatus.COMPLETED);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'evaluation.completed',
        expect.objectContaining({ evaluationId: EVAL_ID }),
        'evaluation-service',
      );
    });

    it('debería actualizar un rating existente en lugar de crear uno nuevo', async () => {
      const evaluation = makeMockEvaluation();
      const existingRating = { id: 'r1', evaluationId: EVAL_ID, criterionId: CRITERION_ID, score: 60, comment: null };
      const completed = makeMockEvaluation({ status: EvaluationStatus.COMPLETED, overallScore: 80, completedAt: new Date() });

      mockEvaluationRepo.findOne.mockResolvedValue(evaluation);
      mockRatingRepo.findOne.mockResolvedValue(existingRating);
      mockRatingRepo.save.mockResolvedValue({ ...existingRating, score: 80 });
      mockRatingRepo.find.mockResolvedValue([{ score: 80 }]);
      mockEvaluationRepo.save.mockResolvedValue(completed);

      await service.submitEvaluation(EVAL_ID, EVALUATOR_ID, dto);

      expect(mockRatingRepo.create).not.toHaveBeenCalled();
      expect(existingRating.score).toBe(80);
    });

    it('debería lanzar NotFoundException si la evaluación no existe', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(null);

      await expect(service.submitEvaluation(EVAL_ID, EVALUATOR_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar ForbiddenException si no es el evaluador', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(
        makeMockEvaluation({ evaluatorId: 'otro-evaluador' }),
      );

      await expect(service.submitEvaluation(EVAL_ID, EVALUATOR_ID, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debería lanzar ConflictException si ya está completada', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(
        makeMockEvaluation({ status: EvaluationStatus.COMPLETED }),
      );

      await expect(service.submitEvaluation(EVAL_ID, EVALUATOR_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería lanzar BadRequestException si está expirada', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(
        makeMockEvaluation({ status: EvaluationStatus.EXPIRED }),
      );

      await expect(service.submitEvaluation(EVAL_ID, EVALUATOR_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // findById
  // ──────────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('debería retornar la evaluación existente', async () => {
      const evaluation = makeMockEvaluation();
      mockEvaluationRepo.findOne.mockResolvedValue(evaluation);

      const result = await service.findById(EVAL_ID);
      expect(result).toBe(evaluation);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockEvaluationRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(EVAL_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // findByApplication
  // ──────────────────────────────────────────────────────────────────
  describe('findByApplication', () => {
    it('debería retornar todas las evaluaciones de una postulación', async () => {
      const evaluations = [makeMockEvaluation(), makeMockEvaluation({ id: 'eval-2' })];
      mockEvaluationRepo.find.mockResolvedValue(evaluations);

      const result = await service.findByApplication(APPLICATION_ID);
      expect(result).toHaveLength(2);
      expect(mockEvaluationRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { applicationId: APPLICATION_ID } }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // findByEvaluator
  // ──────────────────────────────────────────────────────────────────
  describe('findByEvaluator', () => {
    it('debería retornar evaluaciones paginadas del evaluador', async () => {
      const evaluation = makeMockEvaluation();
      mockEvaluationRepo.findAndCount.mockResolvedValue([[evaluation], 1]);

      const query: EvaluationQueryDto = { page: 1, limit: 10 };
      const result = await service.findByEvaluator(EVALUATOR_ID, query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // findByEvaluated
  // ──────────────────────────────────────────────────────────────────
  describe('findByEvaluated', () => {
    it('debería retornar evaluaciones paginadas del evaluado', async () => {
      const evaluation = makeMockEvaluation();
      mockEvaluationRepo.findAndCount.mockResolvedValue([[evaluation], 5]);

      const query: EvaluationQueryDto = { page: 2, limit: 5 };
      const result = await service.findByEvaluated(EVALUATED_ID, query);

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getAggregateScores
  // ──────────────────────────────────────────────────────────────────
  describe('getAggregateScores', () => {
    it('debería calcular promedios cuando hay evaluaciones completadas', async () => {
      const evaluations = [
        makeMockEvaluation({ status: EvaluationStatus.COMPLETED, overallScore: 80 }),
        makeMockEvaluation({
          id: 'eval-2',
          status: EvaluationStatus.COMPLETED,
          overallScore: 60,
          evaluationType: EvaluationType.STUDENT_EVALUATES_COMPANY,
        }),
      ];
      mockEvaluationRepo.find.mockResolvedValue(evaluations);

      const result = await service.getAggregateScores(EVALUATED_ID);

      expect(result.completedCount).toBe(2);
      expect(result.averageScore).toBe(70);
    });

    it('debería retornar nulls si no hay evaluaciones completadas', async () => {
      mockEvaluationRepo.find.mockResolvedValue([]);

      const result = await service.getAggregateScores(EVALUATED_ID);

      expect(result.averageScore).toBeNull();
      expect(result.completedCount).toBe(0);
      expect(result.byType).toEqual({});
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getCriteria
  // ──────────────────────────────────────────────────────────────────
  describe('getCriteria', () => {
    it('debería retornar criterios activos ordenados por displayOrder', async () => {
      const criteria = [
        { id: 'c1', name: 'Criterio A', isActive: true, displayOrder: 1 },
        { id: 'c2', name: 'Criterio B', isActive: true, displayOrder: 2 },
      ];
      mockCriteriaRepo.find.mockResolvedValue(criteria);

      const result = await service.getCriteria();

      expect(result).toHaveLength(2);
      expect(mockCriteriaRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('debería filtrar por evaluationType cuando se proporciona', async () => {
      mockCriteriaRepo.find.mockResolvedValue([]);

      await service.getCriteria(EvaluationType.COMPANY_EVALUATES_STUDENT);

      expect(mockCriteriaRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT,
          },
        }),
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // createCriterion
  // ──────────────────────────────────────────────────────────────────
  describe('createCriterion', () => {
    it('debería crear y retornar el criterio', async () => {
      const dto: CreateCriterionDto = {
        name: 'Habilidades técnicas',
        category: CriterionCategory.TECHNICAL,
        evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT,
      };
      const saved = { id: 'c1', ...dto, isActive: true, isRequired: true, displayOrder: 0, weight: 1, ratingScale: RatingScale.ONE_TO_FIVE };

      mockCriteriaRepo.create.mockReturnValue(saved);
      mockCriteriaRepo.save.mockResolvedValue(saved);

      const result = await service.createCriterion(dto);
      expect(result).toBe(saved);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getTemplates
  // ──────────────────────────────────────────────────────────────────
  describe('getTemplates', () => {
    it('debería retornar templates activos', async () => {
      const templates = [{ id: 't1', name: 'Template A', isActive: true }];
      mockTemplateRepo.find.mockResolvedValue(templates);

      const result = await service.getTemplates();

      expect(result).toHaveLength(1);
      expect(mockTemplateRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });
  });
});

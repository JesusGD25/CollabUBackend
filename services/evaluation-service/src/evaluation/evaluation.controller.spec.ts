import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationType, EvaluationStatus } from './entities/enums';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { CreateCriterionDto } from './dto/create-criterion.dto';
import { EvaluationQueryDto } from './dto/query-evaluation.dto';

// ──────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────
const EVALUATOR_ID = '11111111-1111-1111-1111-111111111111';
const EVALUATED_ID = '22222222-2222-2222-2222-222222222222';
const EVAL_ID = '55555555-5555-5555-5555-555555555555';
const APPLICATION_ID = '33333333-3333-3333-3333-333333333333';
const PROJECT_ID = '44444444-4444-4444-4444-444444444444';

const mockUser = { id: EVALUATOR_ID };

const mockEvaluationService = {
  createEvaluation: jest.fn(),
  submitEvaluation: jest.fn(),
  findById: jest.fn(),
  findByApplication: jest.fn(),
  findByEvaluator: jest.fn(),
  findByEvaluated: jest.fn(),
  getAggregateScores: jest.fn(),
  getCriteria: jest.fn(),
  createCriterion: jest.fn(),
  getTemplates: jest.fn(),
  createTemplate: jest.fn(),
};

// ──────────────────────────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────────────────────────
describe('EvaluationController', () => {
  let controller: EvaluationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [{ provide: EvaluationService, useValue: mockEvaluationService }],
    })
      .overrideGuard(require('@collab-u/shared').JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(require('@collab-u/shared').RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EvaluationController>(EvaluationController);
  });

  afterEach(() => jest.clearAllMocks());

  // ──────────────────────────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('debería delegar a evaluationService.createEvaluation con user.id', async () => {
      const dto: CreateEvaluationDto = {
        applicationId: APPLICATION_ID,
        projectId: PROJECT_ID,
        evaluatedId: EVALUATED_ID,
        evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT,
      };
      const expected = { id: EVAL_ID };
      mockEvaluationService.createEvaluation.mockResolvedValue(expected);

      const result = await controller.create(mockUser, dto);

      expect(result).toBe(expected);
      expect(mockEvaluationService.createEvaluation).toHaveBeenCalledWith(EVALUATOR_ID, dto);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getMyEvaluations
  // ──────────────────────────────────────────────────────────────────
  describe('getMyEvaluations', () => {
    it('debería delegar a evaluationService.findByEvaluator con user.id', async () => {
      const query: EvaluationQueryDto = { page: 1, limit: 10 };
      const expected = { data: [], total: 0, page: 1, limit: 10 };
      mockEvaluationService.findByEvaluator.mockResolvedValue(expected);

      const result = await controller.getMyEvaluations(mockUser, query);

      expect(result).toBe(expected);
      expect(mockEvaluationService.findByEvaluator).toHaveBeenCalledWith(EVALUATOR_ID, query);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getEvaluationsAboutMe
  // ──────────────────────────────────────────────────────────────────
  describe('getEvaluationsAboutMe', () => {
    it('debería delegar a evaluationService.findByEvaluated con user.id', async () => {
      const query: EvaluationQueryDto = {};
      const expected = { data: [], total: 0, page: 1, limit: 10 };
      mockEvaluationService.findByEvaluated.mockResolvedValue(expected);

      const result = await controller.getEvaluationsAboutMe(mockUser, query);

      expect(result).toBe(expected);
      expect(mockEvaluationService.findByEvaluated).toHaveBeenCalledWith(EVALUATOR_ID, query);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getCriteria
  // ──────────────────────────────────────────────────────────────────
  describe('getCriteria', () => {
    it('debería delegar a evaluationService.getCriteria sin filtro', async () => {
      const expected = [{ id: 'c1' }];
      mockEvaluationService.getCriteria.mockResolvedValue(expected);

      const result = await controller.getCriteria();

      expect(result).toBe(expected);
      expect(mockEvaluationService.getCriteria).toHaveBeenCalledWith(undefined);
    });

    it('debería pasar el evaluationType cuando se proporciona', async () => {
      mockEvaluationService.getCriteria.mockResolvedValue([]);

      await controller.getCriteria(EvaluationType.COMPANY_EVALUATES_STUDENT);

      expect(mockEvaluationService.getCriteria).toHaveBeenCalledWith(
        EvaluationType.COMPANY_EVALUATES_STUDENT,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // createCriterion
  // ──────────────────────────────────────────────────────────────────
  describe('createCriterion', () => {
    it('debería delegar a evaluationService.createCriterion', async () => {
      const dto = { name: 'Criterio', category: 'technical', evaluationType: EvaluationType.COMPANY_EVALUATES_STUDENT } as CreateCriterionDto;
      const expected = { id: 'c1', ...dto };
      mockEvaluationService.createCriterion.mockResolvedValue(expected);

      const result = await controller.createCriterion(dto);

      expect(result).toBe(expected);
      expect(mockEvaluationService.createCriterion).toHaveBeenCalledWith(dto);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getTemplates
  // ──────────────────────────────────────────────────────────────────
  describe('getTemplates', () => {
    it('debería delegar a evaluationService.getTemplates', async () => {
      const expected = [{ id: 't1' }];
      mockEvaluationService.getTemplates.mockResolvedValue(expected);

      const result = await controller.getTemplates();

      expect(result).toBe(expected);
      expect(mockEvaluationService.getTemplates).toHaveBeenCalledWith(undefined);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getAggregateScores
  // ──────────────────────────────────────────────────────────────────
  describe('getAggregateScores', () => {
    it('debería delegar a evaluationService.getAggregateScores', async () => {
      const expected = { averageScore: 75, completedCount: 3, byType: {} };
      mockEvaluationService.getAggregateScores.mockResolvedValue(expected);

      const result = await controller.getAggregateScores(EVALUATED_ID);

      expect(result).toBe(expected);
      expect(mockEvaluationService.getAggregateScores).toHaveBeenCalledWith(EVALUATED_ID);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getByApplication
  // ──────────────────────────────────────────────────────────────────
  describe('getByApplication', () => {
    it('debería delegar a evaluationService.findByApplication', async () => {
      const expected = [{ id: EVAL_ID }];
      mockEvaluationService.findByApplication.mockResolvedValue(expected);

      const result = await controller.getByApplication(APPLICATION_ID);

      expect(result).toBe(expected);
      expect(mockEvaluationService.findByApplication).toHaveBeenCalledWith(APPLICATION_ID);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // findOne
  // ──────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('debería delegar a evaluationService.findById', async () => {
      const expected = { id: EVAL_ID };
      mockEvaluationService.findById.mockResolvedValue(expected);

      const result = await controller.findOne(EVAL_ID);

      expect(result).toBe(expected);
      expect(mockEvaluationService.findById).toHaveBeenCalledWith(EVAL_ID);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // submit
  // ──────────────────────────────────────────────────────────────────
  describe('submit', () => {
    it('debería delegar a evaluationService.submitEvaluation con user.id', async () => {
      const dto: SubmitEvaluationDto = {
        ratings: [{ criterionId: '66666666-6666-6666-6666-666666666666', score: 85 }],
      };
      const expected = { id: EVAL_ID, status: EvaluationStatus.COMPLETED };
      mockEvaluationService.submitEvaluation.mockResolvedValue(expected);

      const result = await controller.submit(EVAL_ID, mockUser, dto);

      expect(result).toBe(expected);
      expect(mockEvaluationService.submitEvaluation).toHaveBeenCalledWith(
        EVAL_ID,
        EVALUATOR_ID,
        dto,
      );
    });
  });
});

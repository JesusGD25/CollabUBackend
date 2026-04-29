import { Test, TestingModule } from '@nestjs/testing';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';
import { MatchFactor, CompatibilityLevel, FeedbackType, TargetType } from './entities/enums';
import { MatchResult } from './entities/match-result.entity';
import { MatchRecommendation } from './entities/match-recommendation.entity';
import { MatchFeedback } from './entities/match-feedback.entity';
import { MatchWeight } from './entities/match-weight.entity';

const mockMatchingService = {
  calculateAndStore: jest.fn(),
  calculateForApplication: jest.fn(),
  batchCalculate: jest.fn(),
  getResultsForStudent: jest.fn(),
  getResultsForProject: jest.fn(),
  getResultByStudentAndProject: jest.fn(),
  getWeights: jest.fn(),
  updateWeights: jest.fn(),
  getRecommendations: jest.fn(),
  markRecommendationSeen: jest.fn(),
  dismissRecommendation: jest.fn(),
  submitFeedback: jest.fn(),
};

describe('MatchingController', () => {
  let controller: MatchingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [{ provide: MatchingService, useValue: mockMatchingService }],
    }).compile();

    controller = module.get<MatchingController>(MatchingController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('getResultsForStudent', () => {
    it('debería delegar a matchingService.getResultsForStudent', async () => {
      const expected = { data: [], total: 0 };
      mockMatchingService.getResultsForStudent.mockResolvedValue(expected);
      const result = await controller.getResultsForStudent('student-uuid-1', 1, 20);
      expect(mockMatchingService.getResultsForStudent).toHaveBeenCalledWith('student-uuid-1', 1, 20);
      expect(result).toBe(expected);
    });
  });

  describe('getResultsForProject', () => {
    it('debería delegar a matchingService.getResultsForProject', async () => {
      const expected = { data: [], total: 0 };
      mockMatchingService.getResultsForProject.mockResolvedValue(expected);
      const result = await controller.getResultsForProject('project-uuid-1', 1, 20);
      expect(mockMatchingService.getResultsForProject).toHaveBeenCalledWith('project-uuid-1', 1, 20);
      expect(result).toBe(expected);
    });
  });

  describe('getSpecificResult', () => {
    it('debería delegar a matchingService.getResultByStudentAndProject', async () => {
      const expected = { id: 'result-1', overallScore: 80 } as MatchResult;
      mockMatchingService.getResultByStudentAndProject.mockResolvedValue(expected);
      const result = await controller.getSpecificResult('student-1', 'project-1');
      expect(result).toBe(expected);
    });
  });

  describe('calculate', () => {
    it('debería delegar a matchingService.calculateAndStore', async () => {
      const dto = { studentId: 'student-1', projectId: 'project-1' };
      const expected = { id: 'result-1', overallScore: 75 } as MatchResult;
      mockMatchingService.calculateAndStore.mockResolvedValue(expected);
      const result = await controller.calculate(dto);
      expect(mockMatchingService.calculateAndStore).toHaveBeenCalledWith('student-1', 'project-1');
      expect(result).toBe(expected);
    });
  });

  describe('batchCalculate', () => {
    it('debería delegar a matchingService.batchCalculate', async () => {
      const dto = { projectId: 'p1', studentIds: ['s1', 's2'] };
      const expected = { processed: 2, failed: 0 };
      mockMatchingService.batchCalculate.mockResolvedValue(expected);
      const result = await controller.batchCalculate(dto);
      expect(result).toBe(expected);
    });
  });

  describe('getWeights', () => {
    it('debería retornar los pesos actuales', async () => {
      const weights = [{ id: 'w1', factorName: MatchFactor.SKILLS_MATCH, weight: 0.35 }] as MatchWeight[];
      mockMatchingService.getWeights.mockResolvedValue(weights);
      const result = await controller.getWeights();
      expect(result).toBe(weights);
    });
  });

  describe('updateWeights', () => {
    it('debería delegar a matchingService.updateWeights', async () => {
      const dto = {
        weights: [
          { factorName: MatchFactor.SKILLS_MATCH, weight: 0.40 },
          { factorName: MatchFactor.PROFICIENCY_MATCH, weight: 0.60 },
        ],
      };
      mockMatchingService.updateWeights.mockResolvedValue([]);
      await controller.updateWeights(dto);
      expect(mockMatchingService.updateWeights).toHaveBeenCalledWith(dto);
    });
  });

  describe('getRecommendations', () => {
    it('debería usar TargetType.STUDENT para rol student', async () => {
      const user = { userId: 'user-1', role: 'student' };
      const query = { page: 1, limit: 10 };
      mockMatchingService.getRecommendations.mockResolvedValue({ data: [], total: 0 });
      await controller.getRecommendations(user, query);
      expect(mockMatchingService.getRecommendations).toHaveBeenCalledWith('user-1', TargetType.STUDENT, query);
    });

    it('debería usar TargetType.COMPANY para rol company', async () => {
      const user = { userId: 'user-2', role: 'company' };
      const query = { page: 1, limit: 10 };
      mockMatchingService.getRecommendations.mockResolvedValue({ data: [], total: 0 });
      await controller.getRecommendations(user, query);
      expect(mockMatchingService.getRecommendations).toHaveBeenCalledWith('user-2', TargetType.COMPANY, query);
    });
  });

  describe('markSeen', () => {
    it('debería marcar recomendación como vista', async () => {
      const expected = { id: 'rec-1', isSeen: true } as MatchRecommendation;
      mockMatchingService.markRecommendationSeen.mockResolvedValue(expected);
      const result = await controller.markSeen('rec-1', { userId: 'user-1' });
      expect(mockMatchingService.markRecommendationSeen).toHaveBeenCalledWith('rec-1', 'user-1');
      expect(result).toBe(expected);
    });
  });

  describe('dismiss', () => {
    it('debería descartar recomendación', async () => {
      const expected = { id: 'rec-1', isDismissed: true } as MatchRecommendation;
      mockMatchingService.dismissRecommendation.mockResolvedValue(expected);
      const result = await controller.dismiss('rec-1', { userId: 'user-1' });
      expect(result).toBe(expected);
    });
  });

  describe('submitFeedback', () => {
    it('debería delegar a matchingService.submitFeedback', async () => {
      const dto = { feedbackType: FeedbackType.HELPFUL, comment: 'Muy útil' };
      const expected = { id: 'fb-1' } as MatchFeedback;
      mockMatchingService.submitFeedback.mockResolvedValue(expected);
      const result = await controller.submitFeedback('result-1', { userId: 'user-1' }, dto);
      expect(mockMatchingService.submitFeedback).toHaveBeenCalledWith('result-1', 'user-1', dto);
      expect(result).toBe(expected);
    });
  });
});

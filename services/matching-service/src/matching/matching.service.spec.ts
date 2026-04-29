import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { MatchingService } from './matching.service';
import { MatchWeight } from './entities/match-weight.entity';
import { MatchResult } from './entities/match-result.entity';
import { MatchRecommendation } from './entities/match-recommendation.entity';
import { MatchFeedback } from './entities/match-feedback.entity';
import { MatchFactor, WeightScope, CompatibilityLevel, FeedbackType, TargetType } from './entities/enums';
import { MicroserviceHttpClient, EventPublisher } from '@collab-u/shared';

const mockWeightRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockResultRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockRecommendationRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockFeedbackRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
});

const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
};

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const makeStudentData = () => ({
  id: 'student-uuid-1',
  userId: 'user-uuid-1',
  program: 'Ingeniería de Sistemas',
  faculty: 'Ingeniería',
  semester: 7,
  availability: 'remote',
  skills: [
    { name: 'TypeScript', level: 4 },
    { name: 'NestJS', level: 3 },
  ],
  languages: [{ name: 'English', level: 'B2' }],
  experiences: [{ years: 2 }],
});

const makeProjectData = () => ({
  id: 'project-uuid-1',
  title: 'Sistema de gestión universitaria',
  academicProgram: 'Ingeniería de Sistemas',
  faculty: 'Ingeniería',
  minimumSemester: 6,
  locationType: 'remote',
  requirements: [
    { type: 'skill' as const, name: 'TypeScript', minimumLevel: 3, isRequired: true },
    { type: 'skill' as const, name: 'NestJS', minimumLevel: 2, isRequired: true },
    { type: 'language' as const, name: 'English', isRequired: false },
  ],
  desiredExperienceYears: 1,
});

describe('MatchingService', () => {
  let service: MatchingService;
  let weightRepo: jest.Mocked<Repository<MatchWeight>>;
  let resultRepo: jest.Mocked<Repository<MatchResult>>;
  let recommendationRepo: jest.Mocked<Repository<MatchRecommendation>>;
  let feedbackRepo: jest.Mocked<Repository<MatchFeedback>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchingService,
        { provide: getRepositoryToken(MatchWeight), useFactory: mockWeightRepo },
        { provide: getRepositoryToken(MatchResult), useFactory: mockResultRepo },
        { provide: getRepositoryToken(MatchRecommendation), useFactory: mockRecommendationRepo },
        { provide: getRepositoryToken(MatchFeedback), useFactory: mockFeedbackRepo },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<MatchingService>(MatchingService);
    weightRepo = module.get(getRepositoryToken(MatchWeight));
    resultRepo = module.get(getRepositoryToken(MatchResult));
    recommendationRepo = module.get(getRepositoryToken(MatchRecommendation));
    feedbackRepo = module.get(getRepositoryToken(MatchFeedback));
  });

  afterEach(() => jest.clearAllMocks());

  // ─── calculateForApplication ──────────────────────────────────────────────

  describe('calculateForApplication', () => {
    it('debería retornar el overallScore calculado', async () => {
      const studentData = makeStudentData();
      const projectData = makeProjectData();

      mockHttpClient.get
        .mockResolvedValueOnce({ data: studentData })
        .mockResolvedValueOnce({ data: projectData });

      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);
      const mockResult = { id: 'result-1', overallScore: 82.5, isRecommended: true } as MatchResult;
      resultRepo.create.mockReturnValue(mockResult);
      resultRepo.save.mockResolvedValue(mockResult);
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);

      const score = await service.calculateForApplication('student-uuid-1', 'project-uuid-1');

      expect(typeof score).toBe('number');
      expect(score).toBe(mockResult.overallScore);
    });
  });

  // ─── calculateAndStore ────────────────────────────────────────────────────

  describe('calculateAndStore', () => {
    it('debería crear un nuevo resultado si no existe', async () => {
      const studentData = makeStudentData();
      const projectData = makeProjectData();

      mockHttpClient.get
        .mockResolvedValueOnce({ data: studentData })
        .mockResolvedValueOnce({ data: projectData });

      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);

      const mockResult = {
        id: 'result-1',
        overallScore: 85,
        compatibilityLevel: CompatibilityLevel.HIGH,
        isRecommended: true,
      } as MatchResult;
      resultRepo.create.mockReturnValue(mockResult);
      resultRepo.save.mockResolvedValue(mockResult);
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);

      const result = await service.calculateAndStore('student-uuid-1', 'project-uuid-1');

      expect(resultRepo.create).toHaveBeenCalled();
      expect(resultRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'matching.score.calculated',
        expect.objectContaining({ studentId: 'student-uuid-1', projectId: 'project-uuid-1' }),
        'matching-service',
      );
      expect(result).toBe(mockResult);
    });

    it('debería actualizar un resultado existente', async () => {
      const studentData = makeStudentData();
      const projectData = makeProjectData();

      mockHttpClient.get
        .mockResolvedValueOnce({ data: studentData })
        .mockResolvedValueOnce({ data: projectData });

      weightRepo.find.mockResolvedValue([]);

      const existing = {
        id: 'result-1',
        studentId: 'student-uuid-1',
        projectId: 'project-uuid-1',
        overallScore: 50,
        isRecommended: false,
      } as MatchResult;
      resultRepo.findOne.mockResolvedValue(existing);
      resultRepo.save.mockResolvedValue({ ...existing, overallScore: 85, isRecommended: true } as MatchResult);
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);

      const result = await service.calculateAndStore('student-uuid-1', 'project-uuid-1');

      expect(resultRepo.create).not.toHaveBeenCalled();
      expect(resultRepo.save).toHaveBeenCalled();
    });

    it('debería usar datos vacíos si el HTTP client falla', async () => {
      mockHttpClient.get.mockRejectedValue(new Error('Network error'));
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);

      const mockResult = {
        id: 'result-1',
        overallScore: 0,
        isRecommended: false,
      } as MatchResult;
      resultRepo.create.mockReturnValue(mockResult);
      resultRepo.save.mockResolvedValue(mockResult);

      const result = await service.calculateAndStore('student-uuid-1', 'project-uuid-1');
      expect(result).toBe(mockResult);
    });
  });

  // ─── getResultsForStudent ─────────────────────────────────────────────────

  describe('getResultsForStudent', () => {
    it('debería retornar resultados paginados', async () => {
      const mockResults = [
        { id: 'r1', studentId: 'student-1', overallScore: 90 },
        { id: 'r2', studentId: 'student-1', overallScore: 75 },
      ] as MatchResult[];
      resultRepo.findAndCount.mockResolvedValue([mockResults, 2]);

      const result = await service.getResultsForStudent('student-1', 1, 20);

      expect(result).toEqual({ data: mockResults, total: 2 });
      expect(resultRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { studentId: 'student-1' } }),
      );
    });
  });

  // ─── getResultsForProject ─────────────────────────────────────────────────

  describe('getResultsForProject', () => {
    it('debería retornar resultados por proyecto', async () => {
      resultRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.getResultsForProject('project-1', 1, 20);
      expect(resultRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { projectId: 'project-1' } }),
      );
    });
  });

  // ─── getResultByStudentAndProject ─────────────────────────────────────────

  describe('getResultByStudentAndProject', () => {
    it('debería retornar el resultado si existe', async () => {
      const mockResult = { id: 'r1' } as MatchResult;
      resultRepo.findOne.mockResolvedValue(mockResult);
      const result = await service.getResultByStudentAndProject('s1', 'p1');
      expect(result).toBe(mockResult);
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      resultRepo.findOne.mockResolvedValue(null);
      await expect(service.getResultByStudentAndProject('s1', 'p1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateWeights ────────────────────────────────────────────────────────

  describe('updateWeights', () => {
    const validWeights = [
      { factorName: MatchFactor.SKILLS_MATCH, weight: 0.35 },
      { factorName: MatchFactor.PROFICIENCY_MATCH, weight: 0.15 },
      { factorName: MatchFactor.PROGRAM_MATCH, weight: 0.15 },
      { factorName: MatchFactor.SEMESTER_MATCH, weight: 0.10 },
      { factorName: MatchFactor.AVAILABILITY_MATCH, weight: 0.10 },
      { factorName: MatchFactor.EXPERIENCE_MATCH, weight: 0.10 },
      { factorName: MatchFactor.LANGUAGE_MATCH, weight: 0.05 },
    ];

    it('debería actualizar los pesos si suman 1.0', async () => {
      weightRepo.findOne.mockResolvedValue(null);
      weightRepo.create.mockImplementation((data) => data as MatchWeight);
      weightRepo.save.mockImplementation((data) => Promise.resolve(data as MatchWeight));

      const result = await service.updateWeights({ weights: validWeights });
      expect(result).toHaveLength(7);
    });

    it('debería lanzar BadRequestException si los pesos no suman 1.0', async () => {
      const invalidWeights = [
        { factorName: MatchFactor.SKILLS_MATCH, weight: 0.50 },
        { factorName: MatchFactor.PROFICIENCY_MATCH, weight: 0.10 },
      ];
      await expect(service.updateWeights({ weights: invalidWeights })).rejects.toThrow(BadRequestException);
    });
  });

  // ─── markRecommendationSeen ───────────────────────────────────────────────

  describe('markRecommendationSeen', () => {
    it('debería marcar como vista y actualizar seenAt', async () => {
      const rec = { id: 'rec-1', targetUserId: 'user-1', isSeen: false, seenAt: null } as MatchRecommendation;
      recommendationRepo.findOne.mockResolvedValue(rec);
      recommendationRepo.save.mockResolvedValue({ ...rec, isSeen: true } as MatchRecommendation);

      const result = await service.markRecommendationSeen('rec-1', 'user-1');
      expect(rec.isSeen).toBe(true);
      expect(rec.seenAt).not.toBeNull();
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      recommendationRepo.findOne.mockResolvedValue(null);
      await expect(service.markRecommendationSeen('rec-1', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── submitFeedback ───────────────────────────────────────────────────────

  describe('submitFeedback', () => {
    it('debería crear feedback si no existe uno previo', async () => {
      resultRepo.findOne.mockResolvedValue({ id: 'result-1' } as MatchResult);
      feedbackRepo.findOne.mockResolvedValue(null);
      const feedback = { id: 'fb-1', feedbackType: FeedbackType.HELPFUL } as MatchFeedback;
      feedbackRepo.create.mockReturnValue(feedback);
      feedbackRepo.save.mockResolvedValue(feedback);

      const result = await service.submitFeedback('result-1', 'user-1', { feedbackType: FeedbackType.HELPFUL });
      expect(result).toBe(feedback);
    });

    it('debería lanzar ConflictException si ya existe feedback', async () => {
      resultRepo.findOne.mockResolvedValue({ id: 'result-1' } as MatchResult);
      feedbackRepo.findOne.mockResolvedValue({ id: 'existing-fb' } as MatchFeedback);

      await expect(
        service.submitFeedback('result-1', 'user-1', { feedbackType: FeedbackType.HELPFUL }),
      ).rejects.toThrow(ConflictException);
    });

    it('debería lanzar NotFoundException si el resultado no existe', async () => {
      resultRepo.findOne.mockResolvedValue(null);
      await expect(
        service.submitFeedback('result-1', 'user-1', { feedbackType: FeedbackType.HELPFUL }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── batchCalculate ───────────────────────────────────────────────────────

  describe('batchCalculate', () => {
    it('debería procesar todos los studentIds en lotes', async () => {
      const studentIds = ['s1', 's2', 's3'];
      mockHttpClient.get.mockRejectedValue(new Error('No service'));
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockReturnValue({ id: 'r', overallScore: 0, isRecommended: false } as MatchResult);
      resultRepo.save.mockResolvedValue({ id: 'r', overallScore: 0, isRecommended: false } as MatchResult);

      const result = await service.batchCalculate({ projectId: 'p1', studentIds });
      expect(result.processed + result.failed).toBe(3);
    });

    it('debería retornar 0 procesados si no hay studentIds', async () => {
      const result = await service.batchCalculate({ projectId: 'p1' });
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});

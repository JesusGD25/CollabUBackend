import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
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

const makeStudentData = (overrides: Record<string, unknown> = {}) => ({
  studentId: 'student-uuid-1',
  userId: 'user-uuid-1',
  program: 'Ingeniería de Sistemas',
  semester: 7,
  availability: 'remote',
  skills: [
    { name: 'TypeScript', catalogSkillId: 'cat-ts', category: 'language', proficiencyLevel: 'expert' },
    { name: 'NestJS', catalogSkillId: 'cat-nest', category: 'framework', proficiencyLevel: 'advanced' },
  ],
  languages: [{ language: 'English', proficiency: 'B2' }],
  experiences: [{ type: 'internship', yearsEquivalent: 2 }],
  ...overrides,
});

const makeProjectData = (overrides: Record<string, unknown> = {}) => ({
  projectId: 'project-uuid-1',
  title: 'Sistema de gestión universitaria',
  academicPrograms: ['program-uuid-1'],
  minimumSemester: 6,
  locationType: 'remote',
  requirements: [{ type: 'language' as const, name: 'English', isMandatory: false }],
  skills: [
    { name: 'TypeScript', catalogSkillId: 'cat-ts', category: 'language', proficiencyLevel: 'intermediate', isMandatory: true },
    { name: 'NestJS', catalogSkillId: 'cat-nest', category: 'framework', proficiencyLevel: 'beginner', isMandatory: true },
  ],
  ...overrides,
});

const makePrograms = () => [{ id: 'program-uuid-1', name: 'Ingeniería de Sistemas' }];

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
        .mockResolvedValueOnce(studentData)
        .mockResolvedValueOnce(projectData)
        .mockResolvedValueOnce(makePrograms());

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
        .mockResolvedValueOnce(studentData)
        .mockResolvedValueOnce(projectData)
        .mockResolvedValueOnce(makePrograms());

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
        .mockResolvedValueOnce(studentData)
        .mockResolvedValueOnce(projectData)
        .mockResolvedValueOnce(makePrograms());

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

    it('debería persistir los sub-scores en escala 0-100, no 0-1', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(makeStudentData())
        .mockResolvedValueOnce(makeProjectData())
        .mockResolvedValueOnce(makePrograms());

      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockImplementation((data) => data as MatchResult);
      resultRepo.save.mockImplementation((data) => Promise.resolve(data as MatchResult));
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);

      const result = await service.calculateAndStore('student-uuid-1', 'project-uuid-1');

      // Ambas skills matcheadas por catalogSkillId -> skillsScore 100 (no 1)
      expect(result.skillsScore).toBe(100);
      expect(result.programScore).toBe(100);
      expect(result.semesterScore).toBe(100);
      expect(result.availabilityScore).toBe(100);
      // No debe existir experienceScore (factor eliminado)
      expect((result as unknown as Record<string, unknown>).experienceScore).toBeUndefined();
    });

    it('debería lanzar ServiceUnavailableException si student-service falla (no usar datos vacíos)', async () => {
      mockHttpClient.get.mockRejectedValueOnce(new Error('Network error'));
      weightRepo.find.mockResolvedValue([]);

      await expect(
        service.calculateAndStore('student-uuid-1', 'project-uuid-1'),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(resultRepo.create).not.toHaveBeenCalled();
      expect(resultRepo.save).not.toHaveBeenCalled();
    });

    it('debería lanzar ServiceUnavailableException si project-service falla (no usar datos vacíos)', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(makeStudentData())
        .mockRejectedValueOnce(new Error('Network error'));
      weightRepo.find.mockResolvedValue([]);

      await expect(
        service.calculateAndStore('student-uuid-1', 'project-uuid-1'),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(resultRepo.create).not.toHaveBeenCalled();
      expect(resultRepo.save).not.toHaveBeenCalled();
    });

    it('debería lanzar ServiceUnavailableException si admin-service falla al resolver el programa por nombre (sin programId, no usar score neutral 0.5)', async () => {
      // Estudiante sin programId (fallback por nombre) -> programMatchScore necesita admin-service.
      mockHttpClient.get
        .mockResolvedValueOnce(makeStudentData({ programId: null }))
        .mockResolvedValueOnce(makeProjectData())
        .mockRejectedValueOnce(new Error('admin-service unreachable'));
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);

      await expect(
        service.calculateAndStore('student-uuid-1', 'project-uuid-1'),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(resultRepo.create).not.toHaveBeenCalled();
      expect(resultRepo.save).not.toHaveBeenCalled();
    });
  });

  // ─── Casos de prueba matemáticos del algoritmo real ───────────────────────

  describe('algoritmo de matching — casos controlados', () => {
    const setup = async (studentOverrides = {}, projectOverrides = {}) => {
      mockHttpClient.get
        .mockResolvedValueOnce(makeStudentData(studentOverrides))
        .mockResolvedValueOnce(makeProjectData(projectOverrides))
        .mockResolvedValueOnce(makePrograms());
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockImplementation((data) => data as MatchResult);
      resultRepo.save.mockImplementation((data) => Promise.resolve(data as MatchResult));
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);
      return service.calculateAndStore('student-uuid-1', 'project-uuid-1');
    };

    it('Caso A: match perfecto (skills+niveles+programa) produce score alto', async () => {
      const result = await setup(
        {
          skills: [
            { name: 'TypeScript', catalogSkillId: 'cat-ts', category: 'language', proficiencyLevel: 'expert' },
            { name: 'NestJS', catalogSkillId: 'cat-nest', category: 'framework', proficiencyLevel: 'advanced' },
          ],
        },
        {},
      );
      expect(result.overallScore).toBeGreaterThanOrEqual(90);
    });

    it('Caso B: sin ninguna skill en común produce score significativamente menor', async () => {
      const perfect = await setup();
      mockHttpClient.get.mockReset();
      const noMatch = await setup({
        skills: [{ name: 'Rust', catalogSkillId: 'cat-rust', category: 'language', proficiencyLevel: 'expert' }],
      });
      expect(noMatch.overallScore).toBeLessThan(perfect.overallScore);
      expect(noMatch.skillsScore).toBe(0);
    });

    it('Caso C: coincidencia parcial de skills queda entre match perfecto y sin coincidencias', async () => {
      const partial = await setup({
        skills: [
          { name: 'TypeScript', catalogSkillId: 'cat-ts', category: 'language', proficiencyLevel: 'expert' },
        ],
      });
      // 1 de 2 skills obligatorias coincide -> skillsScore = 50
      expect(partial.skillsScore).toBe(50);
    });

    it('Caso D: programa y skills incompatibles produce score bajo', async () => {
      const result = await setup(
        {
          program: 'Ingeniería Civil',
          skills: [{ name: 'AutoCAD', catalogSkillId: null, category: 'tool', proficiencyLevel: 'beginner' }],
        },
        {},
      );
      expect(result.overallScore).toBeLessThan(40);
    });

    it('nivel de skill insuficiente reduce proficiencyScore proporcionalmente', async () => {
      const result = await setup({
        skills: [
          { name: 'TypeScript', catalogSkillId: 'cat-ts', category: 'language', proficiencyLevel: 'beginner' },
          { name: 'NestJS', catalogSkillId: 'cat-nest', category: 'framework', proficiencyLevel: 'beginner' },
        ],
      });
      // requerido: TS=intermediate(rank2), NestJS=beginner(rank1); estudiante beginner(rank1) en ambos
      // TS: 1/2=0.5, NestJS: 1/1=1.0 -> promedio 0.75 -> 75
      expect(result.proficiencyScore).toBe(75);
    });

    it('normaliza nombres de skill sin catalogSkillId (fallback por nombre)', async () => {
      const result = await setup({
        skills: [
          { name: ' TypeScript ', catalogSkillId: null, category: 'language', proficiencyLevel: 'expert' },
          { name: 'nestjs', catalogSkillId: null, category: 'framework', proficiencyLevel: 'advanced' },
        ],
      });
      expect(result.skillsScore).toBe(100);
    });

    it('proyecto sin skills es dato inconsistente (project-service exige >=1 para publicar) — score 0, no neutral 100', async () => {
      const result = await setup({}, { skills: [] });
      expect(result.skillsScore).toBe(0);
      expect(result.proficiencyScore).toBe(0);
    });

    it('estudiante sin skills frente a proyecto con requisitos produce skillsScore 0', async () => {
      const result = await setup({ skills: [] });
      expect(result.skillsScore).toBe(0);
    });

    it('programMatchScore usa programId directo cuando está disponible (sin llamar a admin-service)', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(makeStudentData({ programId: 'program-uuid-1' }))
        .mockResolvedValueOnce(makeProjectData());
      // Solo 2 mockResolvedValueOnce porque programMatchScore con programId NO debe llamar a admin-service.
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockImplementation((data) => data as MatchResult);
      resultRepo.save.mockImplementation((data) => Promise.resolve(data as MatchResult));
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);

      const result = await service.calculateAndStore('student-uuid-1', 'project-uuid-1');
      expect(result.programScore).toBe(100);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it('programMatchScore con programId que no está en el proyecto da 0, sin ambigüedad de substring', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(makeStudentData({ programId: 'program-uuid-OTRO' }))
        .mockResolvedValueOnce(makeProjectData());
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);
      resultRepo.create.mockImplementation((data) => data as MatchResult);
      resultRepo.save.mockImplementation((data) => Promise.resolve(data as MatchResult));
      recommendationRepo.findOne.mockResolvedValue(null);
      recommendationRepo.create.mockReturnValue({} as MatchRecommendation);
      recommendationRepo.save.mockResolvedValue({} as MatchRecommendation);

      const result = await service.calculateAndStore('student-uuid-1', 'project-uuid-1');
      expect(result.programScore).toBe(0);
    });

    it('genera skillsBreakdown con matched/missing/extra', async () => {
      const result = await setup({
        skills: [
          { name: 'TypeScript', catalogSkillId: 'cat-ts', category: 'language', proficiencyLevel: 'expert' },
          { name: 'Docker', catalogSkillId: 'cat-docker', category: 'tool', proficiencyLevel: 'intermediate' },
        ],
      });
      expect(result.skillsBreakdown?.matched.some((s) => s.name === 'TypeScript')).toBe(true);
      expect(result.skillsBreakdown?.missing.some((s) => s.name === 'NestJS')).toBe(true);
      expect(result.skillsBreakdown?.extra.some((s) => s.name === 'Docker')).toBe(true);
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
      { factorName: MatchFactor.SKILLS_MATCH, weight: 0.45 },
      { factorName: MatchFactor.PROFICIENCY_MATCH, weight: 0.15 },
      { factorName: MatchFactor.PROGRAM_MATCH, weight: 0.15 },
      { factorName: MatchFactor.SEMESTER_MATCH, weight: 0.10 },
      { factorName: MatchFactor.AVAILABILITY_MATCH, weight: 0.10 },
      { factorName: MatchFactor.LANGUAGE_MATCH, weight: 0.05 },
    ];

    it('debería actualizar los pesos si suman 1.0', async () => {
      weightRepo.findOne.mockResolvedValue(null);
      weightRepo.create.mockImplementation((data) => data as MatchWeight);
      weightRepo.save.mockImplementation((data) => Promise.resolve(data as MatchWeight));

      const result = await service.updateWeights({ weights: validWeights });
      expect(result).toHaveLength(6);
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
    it('debería contar como fallidos los cálculos cuyo servicio dependiente no responde (no inventa scores)', async () => {
      const studentIds = ['s1', 's2', 's3'];
      mockHttpClient.get.mockRejectedValue(new Error('No service'));
      weightRepo.find.mockResolvedValue([]);
      resultRepo.findOne.mockResolvedValue(null);

      const result = await service.batchCalculate({ projectId: 'p1', studentIds });
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(3);
      expect(resultRepo.create).not.toHaveBeenCalled();
      expect(resultRepo.save).not.toHaveBeenCalled();
    });

    it('debería retornar 0 procesados si no hay studentIds', async () => {
      const result = await service.batchCalculate({ projectId: 'p1' });
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});

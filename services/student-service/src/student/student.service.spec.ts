import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { StudentService } from './student.service';
import { StudentProfile, StudentAvailability, PreferredWorkMode } from './entities/student-profile.entity';
import { Skill, SkillCategory, ProficiencyLevel } from './entities/skill.entity';
import { Experience, ExperienceType } from './entities/experience.entity';
import { Education } from './entities/education.entity';
import { Certification } from './entities/certification.entity';
import { Language, LanguageProficiency } from './entities/language.entity';
import { Interest } from './entities/interest.entity';

// ─── Mocks ──────────────────────────────────────────────────────────

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockHttpClient = {
  get: jest.fn().mockResolvedValue({}),
  post: jest.fn().mockResolvedValue([]),
  patch: jest.fn().mockResolvedValue({}),
  put: jest.fn().mockResolvedValue({}),
  delete: jest.fn().mockResolvedValue({}),
};

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function createMockProfile(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 'student-uuid-1',
    userId: 'user-uuid-1',
    program: 'Ingeniería de Sistemas',
    faculty: 'Facultad de Ingeniería',
    semester: 6,
    studentCode: null,
    enrollmentYear: null,
    expectedGraduationYear: null,
    gpa: null,
    totalCreditsCompleted: 0,
    totalCreditsRequired: null,
    bio: null,
    headline: null,
    cvUrl: null,
    portfolioUrl: null,
    githubUrl: null,
    personalWebsiteUrl: null,
    availability: StudentAvailability.PART_TIME,
    preferredWorkMode: PreferredWorkMode.HYBRID,
    availableHoursPerWeek: null,
    willingToRelocate: false,
    averageRating: 0,
    totalRatings: 0,
    profileCompleteness: 20,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    skills: [],
    experiences: [],
    education: [],
    certifications: [],
    languages: [],
    interests: [],
    ...overrides,
  } as StudentProfile;
}

function createMockSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    id: 'skill-uuid-1',
    studentId: 'student-uuid-1',
    name: 'TypeScript',
    category: SkillCategory.LANGUAGE,
    proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
    yearsOfExperience: null,
    isVerified: false,
    verifiedBy: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    student: null,
    ...overrides,
  } as Skill;
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('StudentService', () => {
  let service: StudentService;
  let profileRepo: any;
  let skillRepo: any;
  let experienceRepo: any;
  let educationRepo: any;
  let certRepo: any;
  let languageRepo: any;
  let interestRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: getRepositoryToken(StudentProfile), useFactory: createMockRepo },
        { provide: getRepositoryToken(Skill), useFactory: createMockRepo },
        { provide: getRepositoryToken(Experience), useFactory: createMockRepo },
        { provide: getRepositoryToken(Education), useFactory: createMockRepo },
        { provide: getRepositoryToken(Certification), useFactory: createMockRepo },
        { provide: getRepositoryToken(Language), useFactory: createMockRepo },
        { provide: getRepositoryToken(Interest), useFactory: createMockRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get<StudentService>(StudentService);
    profileRepo = module.get(getRepositoryToken(StudentProfile));
    skillRepo = module.get(getRepositoryToken(Skill));
    experienceRepo = module.get(getRepositoryToken(Experience));
    educationRepo = module.get(getRepositoryToken(Education));
    certRepo = module.get(getRepositoryToken(Certification));
    languageRepo = module.get(getRepositoryToken(Language));
    interestRepo = module.get(getRepositoryToken(Interest));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // CREATE PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('createProfile', () => {
    const dto = { userId: 'user-uuid-1', program: 'Ingeniería de Sistemas', semester: 6 };

    it('debería crear un perfil de estudiante', async () => {
      const profile = createMockProfile();
      profileRepo.findOne
        .mockResolvedValueOnce(null) // no existe
        .mockResolvedValueOnce(profile); // getProfile al final
      profileRepo.create.mockReturnValue(profile);
      profileRepo.save.mockResolvedValue(profile);

      const result = await service.createProfile(dto);

      expect(result).toBeDefined();
      expect(profileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: dto.userId, program: dto.program }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'student.profile.created',
        expect.objectContaining({ userId: 'user-uuid-1' }),
        'student-service',
      );
    });

    it('debería lanzar ConflictException si el perfil ya existe', async () => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());

      await expect(service.createProfile(dto)).rejects.toThrow(ConflictException);
      expect(profileRepo.save).not.toHaveBeenCalled();
    });

    it('debería calcular profileCompleteness al crear', async () => {
      const profile = createMockProfile();
      profileRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(profile);
      profileRepo.create.mockReturnValue(profile);
      profileRepo.save.mockResolvedValue(profile);

      await service.createProfile(dto);

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ profileCompleteness: expect.any(Number) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfile', () => {
    it('debería retornar el perfil con relaciones', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getProfile('user-uuid-1');

      expect(result).toEqual(profile);
      expect(profileRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: ['skills', 'experiences', 'education', 'certifications', 'languages', 'interests'],
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('updateProfile', () => {
    it('debería actualizar el perfil y recalcular completeness', async () => {
      const profile = createMockProfile();
      profileRepo.findOne
        .mockResolvedValueOnce(profile)  // getProfile
        .mockResolvedValueOnce(profile)  // save -> recalculate -> findOne en getProfile al final
        .mockResolvedValueOnce({ ...profile, bio: 'Nueva bio' });
      profileRepo.save.mockResolvedValue({ ...profile, bio: 'Nueva bio' });

      await service.updateProfile('user-uuid-1', { bio: 'Nueva bio' });

      expect(profileRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'student.profile.updated',
        expect.objectContaining({ userId: 'user-uuid-1' }),
        'student-service',
      );
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { bio: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SEARCH STUDENTS
  // ═══════════════════════════════════════════════════════════════════
  describe('searchStudents', () => {
    it('debería retornar resultados paginados', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[createMockProfile()], 1]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.searchStudents({ page: 1, limit: 20 });

      expect(result).toEqual({
        data: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('debería filtrar por program', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchStudents({ program: 'Ingeniería de Sistemas', page: 1, limit: 20 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'student.program = :program',
        { program: 'Ingeniería de Sistemas' },
      );
    });

    it('debería filtrar por búsqueda de texto', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchStudents({ search: 'sistemas', page: 1, limit: 20 });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%sistemas%' },
      );
    });

    it('debería filtrar por skills', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      profileRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchStudents({ skills: ['TypeScript', 'NestJS'], page: 1, limit: 20 });

      expect(mockQb.leftJoin).toHaveBeenCalledWith('student.skills', 'skill');
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'skill.name IN (:...skillNames)',
        { skillNames: ['TypeScript', 'NestJS'] },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SKILLS
  // ═══════════════════════════════════════════════════════════════════
  describe('Skills', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('getSkills', () => {
      it('debería retornar las habilidades del estudiante', async () => {
        const skills = [createMockSkill()];
        skillRepo.find.mockResolvedValue(skills);

        const result = await service.getSkills('user-uuid-1');

        expect(result).toEqual(skills);
        expect(skillRepo.find).toHaveBeenCalledWith({
          where: { studentId: 'student-uuid-1' },
          order: { displayOrder: 'ASC', createdAt: 'DESC' },
        });
      });
    });

    describe('addSkill', () => {
      it('debería agregar una habilidad', async () => {
        const skill = createMockSkill();
        skillRepo.create.mockReturnValue(skill);
        skillRepo.save.mockResolvedValue(skill);
        // recalculate completeness
        profileRepo.findOne.mockResolvedValue(createMockProfile({ skills: [skill] }));

        const result = await service.addSkill('user-uuid-1', {
          name: 'TypeScript',
          category: SkillCategory.LANGUAGE,
        });

        expect(result).toBeDefined();
        expect(skillRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'TypeScript', studentId: 'student-uuid-1' }),
        );
      });
    });

    describe('updateSkill', () => {
      it('debería actualizar una habilidad', async () => {
        const skill = createMockSkill();
        skillRepo.findOne.mockResolvedValue(skill);
        skillRepo.save.mockResolvedValue({ ...skill, proficiencyLevel: ProficiencyLevel.ADVANCED });

        const result = await service.updateSkill('user-uuid-1', 'skill-uuid-1', {
          proficiencyLevel: ProficiencyLevel.ADVANCED,
        });

        expect(result.proficiencyLevel).toBe(ProficiencyLevel.ADVANCED);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        skillRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateSkill('user-uuid-1', 'non-existent', { proficiencyLevel: ProficiencyLevel.ADVANCED }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteSkill', () => {
      it('debería eliminar una habilidad', async () => {
        const skill = createMockSkill();
        skillRepo.findOne.mockResolvedValue(skill);
        skillRepo.remove.mockResolvedValue(skill);
        // recalculate
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        await service.deleteSkill('user-uuid-1', 'skill-uuid-1');

        expect(skillRepo.remove).toHaveBeenCalledWith(skill);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        skillRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteSkill('user-uuid-1', 'non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('addSkillsBatch', () => {
      it('debería agregar múltiples habilidades', async () => {
        const skills = [createMockSkill(), createMockSkill({ id: 'skill-uuid-2', name: 'NestJS' })];
        skillRepo.create.mockImplementation((dto: any) => dto);
        skillRepo.save.mockResolvedValue(skills);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ skills }));

        const result = await service.addSkillsBatch('user-uuid-1', [
          { name: 'TypeScript', category: SkillCategory.LANGUAGE },
          { name: 'NestJS', category: SkillCategory.LANGUAGE },
        ]);

        expect(result).toHaveLength(2);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EXPERIENCES
  // ═══════════════════════════════════════════════════════════════════
  describe('Experiences', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('addExperience', () => {
      it('debería agregar una experiencia', async () => {
        const exp = {
          id: 'exp-uuid-1',
          studentId: 'student-uuid-1',
          type: ExperienceType.INTERNSHIP,
          title: 'Pasantía en Dev',
          startDate: new Date('2024-01-01'),
        };
        experienceRepo.create.mockReturnValue(exp);
        experienceRepo.save.mockResolvedValue(exp);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ experiences: [exp as any] }));

        const result = await service.addExperience('user-uuid-1', {
          type: ExperienceType.INTERNSHIP,
          title: 'Pasantía en Dev',
          startDate: '2024-01-01' as any,
        });

        expect(result).toBeDefined();
        expect(experienceRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Pasantía en Dev', studentId: 'student-uuid-1' }),
        );
      });
    });

    describe('deleteExperience', () => {
      it('debería eliminar una experiencia', async () => {
        const exp = { id: 'exp-uuid-1', studentId: 'student-uuid-1' };
        experienceRepo.findOne.mockResolvedValue(exp);
        experienceRepo.remove.mockResolvedValue(exp);
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        await service.deleteExperience('user-uuid-1', 'exp-uuid-1');

        expect(experienceRepo.remove).toHaveBeenCalledWith(exp);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        experienceRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteExperience('user-uuid-1', 'non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EDUCATION
  // ═══════════════════════════════════════════════════════════════════
  describe('Education', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('addEducation', () => {
      it('debería agregar formación académica', async () => {
        const edu = {
          id: 'edu-uuid-1',
          studentId: 'student-uuid-1',
          institution: 'Universidad de Nariño',
          degree: 'Ingeniería de Sistemas',
        };
        educationRepo.create.mockReturnValue(edu);
        educationRepo.save.mockResolvedValue(edu);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ education: [edu as any] }));

        const result = await service.addEducation('user-uuid-1', {
          institution: 'Universidad de Nariño',
          degree: 'Ingeniería de Sistemas',
          startDate: '2020-01-01' as any,
        });

        expect(result).toBeDefined();
      });
    });

    describe('deleteEducation', () => {
      it('debería eliminar formación', async () => {
        const edu = { id: 'edu-uuid-1', studentId: 'student-uuid-1' };
        educationRepo.findOne.mockResolvedValue(edu);
        educationRepo.remove.mockResolvedValue(edu);
        profileRepo.findOne.mockResolvedValue(createMockProfile());

        await service.deleteEducation('user-uuid-1', 'edu-uuid-1');

        expect(educationRepo.remove).toHaveBeenCalledWith(edu);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CERTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════
  describe('Certifications', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('addCertification', () => {
      it('debería agregar una certificación', async () => {
        const cert = { id: 'cert-uuid-1', studentId: 'student-uuid-1', name: 'AWS SAA' };
        certRepo.create.mockReturnValue(cert);
        certRepo.save.mockResolvedValue(cert);

        const result = await service.addCertification('user-uuid-1', {
          name: 'AWS SAA',
          issuingOrganization: 'Amazon',
          issueDate: '2024-01-01' as any,
        });

        expect(result).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LANGUAGES
  // ═══════════════════════════════════════════════════════════════════
  describe('Languages', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('addLanguage', () => {
      it('debería agregar un idioma', async () => {
        const lang = { id: 'lang-uuid-1', studentId: 'student-uuid-1', language: 'Inglés' };
        languageRepo.create.mockReturnValue(lang);
        languageRepo.save.mockResolvedValue(lang);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ languages: [lang as any] }));

        const result = await service.addLanguage('user-uuid-1', {
          language: 'Inglés',
          proficiency: LanguageProficiency.ADVANCED,
        });

        expect(result).toBeDefined();
      });
    });

    describe('deleteLanguage', () => {
      it('debería lanzar NotFoundException si no existe', async () => {
        languageRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteLanguage('user-uuid-1', 'non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTERESTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Interests', () => {
    beforeEach(() => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());
    });

    describe('addInterest', () => {
      it('debería agregar un interés', async () => {
        const interest = { id: 'int-uuid-1', studentId: 'student-uuid-1', area: 'IA' };
        interestRepo.create.mockReturnValue(interest);
        interestRepo.save.mockResolvedValue(interest);
        profileRepo.findOne.mockResolvedValue(createMockProfile({ interests: [interest as any] }));

        const result = await service.addInterest('user-uuid-1', { area: 'IA' });

        expect(result).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // MATCHING DATA (inter-servicio)
  // ═══════════════════════════════════════════════════════════════════
  describe('getMatchingData', () => {
    it('debería retornar datos para matching', async () => {
      const profile = createMockProfile({
        skills: [createMockSkill()],
        languages: [{ id: 'l1', language: 'Inglés', proficiency: LanguageProficiency.ADVANCED } as any],
        experiences: [],
      });
      profileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getMatchingData('user-uuid-1');

      expect(result).toHaveProperty('studentId');
      expect(result).toHaveProperty('program');
      expect(result).toHaveProperty('skills');
      expect(result).toHaveProperty('languages');
      expect(result).toHaveProperty('experiences');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getMatchingData('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE RATING (inter-servicio)
  // ═══════════════════════════════════════════════════════════════════
  describe('updateRating', () => {
    it('debería actualizar el rating del estudiante', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValue(profile);
      profileRepo.save.mockResolvedValue({ ...profile, averageRating: 4.5, totalRatings: 10 });

      await service.updateRating('user-uuid-1', 4.5, 10);

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ averageRating: 4.5, totalRatings: 10 }),
      );
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.updateRating('non-existent', 4.5, 10)).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE COMPLETENESS (indirecto)
  // ═══════════════════════════════════════════════════════════════════
  describe('calculateCompleteness (indirecto)', () => {
    it('debería calcular 20% para perfil con solo program y semester', async () => {
      const profile = createMockProfile({
        program: 'Ingeniería',
        semester: 6,
        bio: null,
        cvUrl: null,
        skills: [],
        experiences: [],
        education: [],
        languages: [],
        interests: [],
      });
      profileRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(profile);
      profileRepo.create.mockReturnValue(profile);
      profileRepo.save.mockImplementation(async (p: any) => {
        profile.profileCompleteness = p.profileCompleteness;
        return p;
      });

      await service.createProfile({ userId: 'new-user', program: 'Ingeniería', semester: 6 });

      expect(profile.profileCompleteness).toBe(20);
    });
  });
});

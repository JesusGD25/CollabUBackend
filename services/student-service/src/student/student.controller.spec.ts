import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { JwtAuthGuard, RolesGuard } from '@collab-u/shared';
import { SkillCategory, ProficiencyLevel } from './entities/skill.entity';
import { ExperienceType } from './entities/experience.entity';
import { LanguageProficiency } from './entities/language.entity';

const mockStudentService = {
  createProfile: jest.fn(),
  getProfile: jest.fn(),
  getProfileById: jest.fn(),
  updateProfile: jest.fn(),
  searchStudents: jest.fn(),
  getSkills: jest.fn(),
  addSkill: jest.fn(),
  addSkillsBatch: jest.fn(),
  updateSkill: jest.fn(),
  deleteSkill: jest.fn(),
  getExperiences: jest.fn(),
  addExperience: jest.fn(),
  updateExperience: jest.fn(),
  deleteExperience: jest.fn(),
  getEducation: jest.fn(),
  addEducation: jest.fn(),
  updateEducation: jest.fn(),
  deleteEducation: jest.fn(),
  getCertifications: jest.fn(),
  addCertification: jest.fn(),
  updateCertification: jest.fn(),
  deleteCertification: jest.fn(),
  getLanguages: jest.fn(),
  addLanguage: jest.fn(),
  updateLanguage: jest.fn(),
  deleteLanguage: jest.fn(),
  getInterests: jest.fn(),
  addInterest: jest.fn(),
  updateInterest: jest.fn(),
  deleteInterest: jest.fn(),
};

describe('StudentController', () => {
  let controller: StudentController;
  let service: typeof mockStudentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [{ provide: StudentService, useValue: mockStudentService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StudentController>(StudentController);
    service = mockStudentService;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('createProfile', () => {
    it('debería forzar userId del token JWT y crear perfil', async () => {
      const user = { userId: 'user-uuid-1' };
      const dto = { userId: 'ignored', program: 'Ingeniería', semester: 6 } as any;
      const expected = { id: 'profile-1', userId: 'user-uuid-1', program: 'Ingeniería' };
      service.createProfile.mockResolvedValue(expected);

      const result = await controller.createProfile(user, dto);

      expect(dto.userId).toBe('user-uuid-1');
      expect(result).toEqual(expected);
    });
  });

  describe('getMyProfile', () => {
    it('debería retornar el perfil del usuario autenticado', async () => {
      const user = { userId: 'user-uuid-1' };
      const profile = { userId: 'user-uuid-1', program: 'Ingeniería' };
      service.getProfile.mockResolvedValue(profile);

      const result = await controller.getMyProfile(user);

      expect(result).toEqual(profile);
      expect(service.getProfile).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('getProfileByUserId', () => {
    it('debería retornar el perfil de otro usuario', async () => {
      const profile = { userId: 'other-user', program: 'Derecho' };
      service.getProfileById.mockResolvedValue(profile);

      const result = await controller.getProfileByUserId('other-user');

      expect(result).toEqual(profile);
      expect(service.getProfileById).toHaveBeenCalledWith('other-user');
    });
  });

  describe('updateProfile', () => {
    it('debería actualizar el perfil', async () => {
      const user = { userId: 'user-uuid-1' };
      const dto = { bio: 'Nueva bio' };
      const updated = { userId: 'user-uuid-1', bio: 'Nueva bio' };
      service.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateProfile(user, dto);

      expect(result).toEqual(updated);
      expect(service.updateProfile).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });

  describe('searchStudents', () => {
    it('debería retornar resultados de búsqueda paginados', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      service.searchStudents.mockResolvedValue(expected);

      const result = await controller.searchStudents(query as any);

      expect(result).toEqual(expected);
      expect(service.searchStudents).toHaveBeenCalledWith(query);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SKILLS
  // ═══════════════════════════════════════════════════════════════════
  describe('Skills endpoints', () => {
    const user = { userId: 'user-uuid-1' };

    it('debería obtener habilidades', async () => {
      const skills = [{ id: '1', name: 'TS' }];
      service.getSkills.mockResolvedValue(skills);

      const result = await controller.getSkills(user);
      expect(result).toEqual(skills);
    });

    it('debería agregar una habilidad', async () => {
      const dto = { name: 'TypeScript', category: SkillCategory.LANGUAGE };
      const expected = { id: '1', ...dto };
      service.addSkill.mockResolvedValue(expected);

      const result = await controller.addSkill(user, dto);
      expect(result).toEqual(expected);
    });

    it('debería agregar habilidades en batch', async () => {
      const dtos = [
        { name: 'TypeScript', category: SkillCategory.LANGUAGE },
        { name: 'NestJS', category: SkillCategory.LANGUAGE },
      ];
      service.addSkillsBatch.mockResolvedValue(dtos);

      const result = await controller.addSkillsBatch(user, dtos);
      expect(result).toHaveLength(2);
    });

    it('debería actualizar una habilidad', async () => {
      const dto = { proficiencyLevel: ProficiencyLevel.ADVANCED };
      service.updateSkill.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.updateSkill(user, 'skill-1', dto);
      expect(result.proficiencyLevel).toBe(ProficiencyLevel.ADVANCED);
    });

    it('debería eliminar una habilidad', async () => {
      service.deleteSkill.mockResolvedValue(undefined);
      await controller.deleteSkill(user, 'skill-1');
      expect(service.deleteSkill).toHaveBeenCalledWith('user-uuid-1', 'skill-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EXPERIENCES
  // ═══════════════════════════════════════════════════════════════════
  describe('Experiences endpoints', () => {
    const user = { userId: 'user-uuid-1' };

    it('debería obtener experiencias', async () => {
      const exps = [{ id: '1', title: 'Dev Jr' }];
      service.getExperiences.mockResolvedValue(exps);

      const result = await controller.getExperiences(user);
      expect(result).toEqual(exps);
    });

    it('debería agregar una experiencia', async () => {
      const dto = { type: ExperienceType.INTERNSHIP, title: 'Pasantía', startDate: '2024-01-01' as any };
      service.addExperience.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.addExperience(user, dto);
      expect(result).toBeDefined();
    });

    it('debería eliminar una experiencia', async () => {
      service.deleteExperience.mockResolvedValue(undefined);
      await controller.deleteExperience(user, 'exp-1');
      expect(service.deleteExperience).toHaveBeenCalledWith('user-uuid-1', 'exp-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // EDUCATION
  // ═══════════════════════════════════════════════════════════════════
  describe('Education endpoints', () => {
    const user = { userId: 'user-uuid-1' };

    it('debería obtener formación', async () => {
      service.getEducation.mockResolvedValue([]);
      const result = await controller.getEducation(user);
      expect(result).toEqual([]);
    });

    it('debería agregar formación', async () => {
      const dto = { institution: 'UDENAR', degree: 'IS', startDate: '2020-01-01' as any };
      service.addEducation.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.addEducation(user, dto);
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CERTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════
  describe('Certifications endpoints', () => {
    const user = { userId: 'user-uuid-1' };

    it('debería obtener certificaciones', async () => {
      service.getCertifications.mockResolvedValue([]);
      const result = await controller.getCertifications(user);
      expect(result).toEqual([]);
    });

    it('debería agregar una certificación', async () => {
      const dto = { name: 'AWS', issuingOrganization: 'Amazon', issueDate: '2024-01-01' as any };
      service.addCertification.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.addCertification(user, dto);
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LANGUAGES
  // ═══════════════════════════════════════════════════════════════════
  describe('Languages endpoints', () => {
    const user = { userId: 'user-uuid-1' };

    it('debería obtener idiomas', async () => {
      service.getLanguages.mockResolvedValue([]);
      const result = await controller.getLanguages(user);
      expect(result).toEqual([]);
    });

    it('debería agregar un idioma', async () => {
      const dto = { language: 'Inglés', proficiency: LanguageProficiency.ADVANCED };
      service.addLanguage.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.addLanguage(user, dto);
      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTERESTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Interests endpoints', () => {
    const user = { userId: 'user-uuid-1' };

    it('debería obtener intereses', async () => {
      service.getInterests.mockResolvedValue([]);
      const result = await controller.getInterests(user);
      expect(result).toEqual([]);
    });

    it('debería agregar un interés', async () => {
      const dto = { area: 'Inteligencia Artificial' };
      service.addInterest.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.addInterest(user, dto);
      expect(result).toBeDefined();
    });

    it('debería eliminar un interés', async () => {
      service.deleteInterest.mockResolvedValue(undefined);
      await controller.deleteInterest(user, 'int-1');
      expect(service.deleteInterest).toHaveBeenCalledWith('user-uuid-1', 'int-1');
    });
  });
});

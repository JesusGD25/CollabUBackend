import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { ProjectService } from './project.service';
import { Project, ProjectType, ProjectStatus, LocationType, CompensationType } from './entities/project.entity';
import { ProjectRequirement, RequirementType } from './entities/project-requirement.entity';
import { ProjectDeliverable } from './entities/project-deliverable.entity';
import { ProjectSkill, SkillCategory } from './entities/project-skill.entity';
import { ProjectActivity, ActivityStatus, ActivityPriority } from './entities/project-activity.entity';

// ─── Mocks ──────────────────────────────────────────────────────────

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockHttpClient = {
  get: jest.fn().mockResolvedValue({ exists: true, isActive: true, isVerified: true }),
  post: jest.fn().mockResolvedValue([]),
  patch: jest.fn(),
};

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-uuid-1',
    companyId: 'company-uuid-1',
    createdByUserId: 'user-uuid-1',
    title: 'Desarrollo de módulo de inventarios',
    slug: 'desarrollo-de-modulo-de-inventarios-m4k2f',
    description: 'Se requiere un desarrollador full-stack para implementar un módulo completo de inventarios',
    shortDescription: 'Módulo de inventarios',
    projectType: ProjectType.INTERNSHIP,
    status: ProjectStatus.DRAFT,
    durationMonths: 6,
    startDate: new Date('2025-07-01'),
    endDate: null,
    locationType: LocationType.HYBRID,
    location: 'Pasto, Nariño',
    compensationType: CompensationType.ACADEMIC_CREDIT,
    compensationAmount: null,
    currency: 'COP',
    positionsAvailable: 2,
    positionsFilled: 0,
    applicationDeadline: new Date('2025-06-01'),
    academicPrograms: ['program-uuid-1'],
    minimumSemester: 7,
    requestDocumentFileId: 'doc-uuid-1',
    isActive: true,
    isFeatured: false,
    viewsCount: 0,
    applicationsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    requirements: [],
    deliverables: [],
    skills: [],
    activities: [],
    generateSlug: jest.fn(),
    ...overrides,
  } as unknown as Project;
}

function createMockRequirement(overrides: Partial<ProjectRequirement> = {}): ProjectRequirement {
  return {
    id: 'req-uuid-1',
    projectId: 'project-uuid-1',
    requirementType: RequirementType.SKILL,
    name: 'NestJS',
    description: 'Experiencia con NestJS',
    isMandatory: true,
    proficiencyLevel: 'intermediate',
    displayOrder: 0,
    createdAt: new Date(),
    project: null,
    ...overrides,
  } as ProjectRequirement;
}

function createMockDeliverable(overrides: Partial<ProjectDeliverable> = {}): ProjectDeliverable {
  return {
    id: 'del-uuid-1',
    projectId: 'project-uuid-1',
    title: 'Documento de diseño',
    description: 'Documento con la arquitectura del módulo',
    dueDate: new Date('2025-08-15'),
    weightPercentage: 20,
    displayOrder: 0,
    isMandatory: true,
    createdAt: new Date(),
    project: null,
    ...overrides,
  } as ProjectDeliverable;
}

function createMockSkill(overrides: Partial<ProjectSkill> = {}): ProjectSkill {
  return {
    id: 'skill-uuid-1',
    projectId: 'project-uuid-1',
    name: 'nestjs',
    catalogSkillId: null,
    category: SkillCategory.FRAMEWORK,
    proficiencyLevel: null,
    isMandatory: true,
    displayOrder: 0,
    createdAt: new Date(),
    project: null,
    ...overrides,
  } as ProjectSkill;
}

function createMockActivity(overrides: Partial<ProjectActivity> = {}): ProjectActivity {
  return {
    id: 'act-uuid-1',
    projectId: 'project-uuid-1',
    studentId: 'student-uuid-1',
    assignedBy: 'user-uuid-1',
    title: 'Investigación de tecnologías',
    description: 'Investigar stack tecnológico',
    activityType: 'research',
    scheduledDate: null,
    dueDate: new Date('2025-07-15'),
    completedDate: null,
    status: ActivityStatus.PENDING,
    priority: ActivityPriority.MEDIUM,
    hoursEstimated: 8,
    hoursActual: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    project: null,
    ...overrides,
  } as ProjectActivity;
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepo: any;
  let requirementRepo: any;
  let deliverableRepo: any;
  let skillRepo: any;
  let activityRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: getRepositoryToken(Project), useFactory: createMockRepo },
        { provide: getRepositoryToken(ProjectRequirement), useFactory: createMockRepo },
        { provide: getRepositoryToken(ProjectDeliverable), useFactory: createMockRepo },
        { provide: getRepositoryToken(ProjectSkill), useFactory: createMockRepo },
        { provide: getRepositoryToken(ProjectActivity), useFactory: createMockRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepo = module.get(getRepositoryToken(Project));
    requirementRepo = module.get(getRepositoryToken(ProjectRequirement));
    deliverableRepo = module.get(getRepositoryToken(ProjectDeliverable));
    skillRepo = module.get(getRepositoryToken(ProjectSkill));
    activityRepo = module.get(getRepositoryToken(ProjectActivity));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // CREATE PROJECT
  // ═══════════════════════════════════════════════════════════════════
  describe('createProject', () => {
    const dto = {
      title: 'Desarrollo de módulo de inventarios',
      description: 'Se requiere un desarrollador full-stack para implementar un módulo completo de inventarios',
      projectType: ProjectType.INTERNSHIP,
      durationMonths: 6,
      locationType: LocationType.HYBRID,
      location: 'Pasto, Nariño',
      skills: [
        { name: 'nestjs', category: SkillCategory.FRAMEWORK },
        { name: 'angular', category: SkillCategory.FRAMEWORK },
      ],
    };

    it('debería crear un proyecto con habilidades', async () => {
      const project = createMockProject();
      projectRepo.create.mockReturnValue(project);
      projectRepo.save.mockResolvedValue(project);
      projectRepo.findOne.mockResolvedValue({ ...project, skills: [createMockSkill()] });
      skillRepo.create.mockReturnValue(createMockSkill());
      skillRepo.save.mockResolvedValue([createMockSkill()]);

      const result = await service.createProject('user-uuid-1', 'company-uuid-1', dto as any);

      expect(result).toBeDefined();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'company',
        '/internal/companies/company-uuid-1/exists',
      );
      expect(projectRepo.create).toHaveBeenCalled();
      expect(projectRepo.save).toHaveBeenCalled();
      expect(skillRepo.create).toHaveBeenCalledTimes(2);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.created',
        expect.objectContaining({ projectId: 'project-uuid-1' }),
        'project-service',
      );
    });

    it('debería lanzar BadRequestException si la empresa no existe', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ exists: false, isActive: false, isVerified: false });

      await expect(
        service.createProject('user-uuid-1', 'company-uuid-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    // Deshabilitado: la validación de isVerified está comentada intencionalmente en
    // project.service.ts (ver TODO ahí) para permitir crear proyectos mientras el
    // flujo de verificación de empresas no está completo en el frontend.
    it.skip('debería lanzar BadRequestException si la empresa no está verificada', async () => {
      mockHttpClient.get.mockResolvedValueOnce({ exists: true, isActive: true, isVerified: false });

      await expect(
        service.createProject('user-uuid-1', 'company-uuid-1', dto),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería crear un proyecto sin habilidades', async () => {
      const project = createMockProject();
      const dtoNoSkills = { ...dto, skills: undefined };
      projectRepo.create.mockReturnValue(project);
      projectRepo.save.mockResolvedValue(project);
      projectRepo.findOne.mockResolvedValue(project);

      const result = await service.createProject('user-uuid-1', 'company-uuid-1', dtoNoSkills as any);

      expect(result).toBeDefined();
      expect(skillRepo.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROJECT BY ID
  // ═══════════════════════════════════════════════════════════════════
  describe('getProjectById', () => {
    it('debería retornar el proyecto con relaciones (dueño ve su propio borrador)', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);

      const result = await service.getProjectById('project-uuid-1', false, 'user-uuid-1', 'company');

      expect(result).toEqual(project);
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'project-uuid-1' },
        relations: ['requirements', 'deliverables', 'skills', 'activities'],
      });
    });

    it('debería incrementar viewsCount cuando incrementViews=true en proyecto publicado', async () => {
      const project = createMockProject({ viewsCount: 5, status: ProjectStatus.PUBLISHED });
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.save.mockResolvedValue({ ...project, viewsCount: 6 });

      const result = await service.getProjectById('project-uuid-1', true);

      expect(result.viewsCount).toBe(6);
      expect(projectRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.viewed',
        expect.objectContaining({ projectId: 'project-uuid-1', viewsCount: 6 }),
        'project-service',
      );
    });

    it('no debería incrementar viewsCount cuando incrementViews=false', async () => {
      const project = createMockProject({ viewsCount: 5, status: ProjectStatus.PUBLISHED });
      projectRepo.findOne.mockResolvedValue(project);

      const result = await service.getProjectById('project-uuid-1', false);

      expect(result.viewsCount).toBe(5);
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.getProjectById('no-existe')).rejects.toThrow(NotFoundException);
    });

    // ── Visibilidad (fix de seguridad: GET /:id ahora es público solo para proyectos publicados) ──
    it('debería retornar un proyecto PUBLISHED a un visitante anónimo', async () => {
      const project = createMockProject({ status: ProjectStatus.PUBLISHED });
      projectRepo.findOne.mockResolvedValue(project);

      const result = await service.getProjectById('project-uuid-1');

      expect(result).toEqual(project);
    });

    it('debería lanzar NotFoundException si un anónimo intenta ver un DRAFT', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT });
      projectRepo.findOne.mockResolvedValue(project);

      await expect(service.getProjectById('project-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar NotFoundException si otro usuario (no dueño) intenta ver un DRAFT', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT, createdByUserId: 'owner-uuid' });
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.getProjectById('project-uuid-1', false, 'otro-usuario-uuid', 'company'),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería permitir a un admin ver un DRAFT de cualquier empresa', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT, createdByUserId: 'owner-uuid' });
      projectRepo.findOne.mockResolvedValue(project);

      const result = await service.getProjectById('project-uuid-1', false, 'admin-uuid', 'admin');

      expect(result).toEqual(project);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROJECT BY SLUG
  // ═══════════════════════════════════════════════════════════════════
  describe('getProjectBySlug', () => {
    it('debería retornar el proyecto por slug', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);

      const result = await service.getProjectBySlug('desarrollo-de-modulo-m4k2f');

      expect(result).toBeDefined();
      expect(projectRepo.findOne).toHaveBeenCalledWith({
        where: { slug: 'desarrollo-de-modulo-m4k2f' },
        relations: ['requirements', 'deliverables', 'skills'],
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      projectRepo.findOne.mockResolvedValue(null);

      await expect(service.getProjectBySlug('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROJECT
  // ═══════════════════════════════════════════════════════════════════
  describe('updateProject', () => {
    it('debería actualizar el proyecto', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.save.mockResolvedValue(project);

      const result = await service.updateProject(
        'project-uuid-1',
        'user-uuid-1',
        { description: 'Nueva descripción con al menos cincuenta caracteres para cumplir la validación' },
      );

      expect(result).toBeDefined();
      expect(projectRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.updated',
        expect.objectContaining({ projectId: 'project-uuid-1' }),
        'project-service',
      );
    });

    it('debería lanzar ForbiddenException si no es el dueño', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.updateProject('project-uuid-1', 'otro-usuario', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar BadRequestException si el estado no permite edición', async () => {
      const project = createMockProject({ status: ProjectStatus.IN_PROGRESS });
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.updateProject('project-uuid-1', 'user-uuid-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería reemplazar habilidades si se proporcionan', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.save.mockResolvedValue(project);
      skillRepo.delete.mockResolvedValue(undefined);
      skillRepo.create.mockReturnValue(createMockSkill());
      skillRepo.save.mockResolvedValue([createMockSkill()]);

      await service.updateProject('project-uuid-1', 'user-uuid-1', {
        skills: [
          { name: 'react', category: SkillCategory.FRAMEWORK },
          { name: 'node', category: SkillCategory.FRAMEWORK },
        ],
      } as any);

      expect(skillRepo.delete).toHaveBeenCalledWith({ projectId: 'project-uuid-1' });
      expect(skillRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROJECT STATUS
  // ═══════════════════════════════════════════════════════════════════
  describe('updateProjectStatus', () => {
    it('NO debería permitir que la empresa publique directamente (solo vía revisión de la Facultad)', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT });
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.updateProjectStatus('project-uuid-1', 'user-uuid-1', { status: ProjectStatus.PUBLISHED }),
      ).rejects.toThrow(BadRequestException);
      expect(projectRepo.save).not.toHaveBeenCalled();
    });

    it('debería cambiar de draft a pending_approval (enviar a revisión)', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT });
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.save.mockResolvedValue({ ...project, status: ProjectStatus.PENDING_APPROVAL });
      skillRepo.count.mockResolvedValue(1);

      const result = await service.updateProjectStatus(
        'project-uuid-1',
        'user-uuid-1',
        { status: ProjectStatus.PENDING_APPROVAL },
      );

      expect(result.status).toBe(ProjectStatus.PENDING_APPROVAL);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.status.changed',
        expect.objectContaining({
          previousStatus: ProjectStatus.DRAFT,
          newStatus: ProjectStatus.PENDING_APPROVAL,
        }),
        'project-service',
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.submitted_for_review',
        expect.objectContaining({ projectId: 'project-uuid-1' }),
        'project-service',
      );
    });

    it('debería lanzar BadRequestException si no tiene habilidades al enviar a revisión', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT });
      projectRepo.findOne.mockResolvedValue(project);
      skillRepo.count.mockResolvedValue(0);

      await expect(
        service.updateProjectStatus('project-uuid-1', 'user-uuid-1', { status: ProjectStatus.PENDING_APPROVAL }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si no tiene programas académicos al enviar a revisión', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT, academicPrograms: [] });
      projectRepo.findOne.mockResolvedValue(project);
      skillRepo.count.mockResolvedValue(1);

      await expect(
        service.updateProjectStatus('project-uuid-1', 'user-uuid-1', { status: ProjectStatus.PENDING_APPROVAL }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si no tiene documento de solicitud al enviar a revisión', async () => {
      const project = createMockProject({ status: ProjectStatus.DRAFT, requestDocumentFileId: null });
      projectRepo.findOne.mockResolvedValue(project);
      skillRepo.count.mockResolvedValue(1);

      await expect(
        service.updateProjectStatus('project-uuid-1', 'user-uuid-1', { status: ProjectStatus.PENDING_APPROVAL }),
      ).rejects.toThrow(BadRequestException);
    });

    it('reviewProject: admin debería poder aprobar y publicar un proyecto en pending_approval', async () => {
      const project = createMockProject({ status: ProjectStatus.PENDING_APPROVAL });
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.save.mockResolvedValue({ ...project, status: ProjectStatus.PUBLISHED });
      requirementRepo.find.mockResolvedValue([createMockRequirement()]);

      const result = await service.reviewProject('project-uuid-1', 'admin-uuid', 'approve', {});

      expect(result.status).toBe(ProjectStatus.PUBLISHED);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.published',
        expect.objectContaining({ projectId: 'project-uuid-1' }),
        'project-service',
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.faculty_approved',
        expect.objectContaining({ projectId: 'project-uuid-1' }),
        'project-service',
      );
    });

    it('debería cambiar de published a in_progress', async () => {
      const project = createMockProject({ status: ProjectStatus.PUBLISHED });
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.save.mockResolvedValue({ ...project, status: ProjectStatus.IN_PROGRESS });

      const result = await service.updateProjectStatus(
        'project-uuid-1',
        'user-uuid-1',
        { status: ProjectStatus.IN_PROGRESS },
      );

      expect(result).toBeDefined();
    });

    it('debería lanzar BadRequestException para transición inválida', async () => {
      const project = createMockProject({ status: ProjectStatus.COMPLETED });
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.updateProjectStatus('project-uuid-1', 'user-uuid-1', { status: ProjectStatus.PUBLISHED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar ForbiddenException si no es el dueño', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.updateProjectStatus('project-uuid-1', 'otro-usuario', { status: ProjectStatus.PUBLISHED }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELETE PROJECT
  // ═══════════════════════════════════════════════════════════════════
  describe('deleteProject', () => {
    it('debería eliminar el proyecto si es el dueño', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.remove.mockResolvedValue(project);

      await service.deleteProject('project-uuid-1', 'user-uuid-1');

      expect(projectRepo.remove).toHaveBeenCalledWith(project);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'project.deleted',
        expect.objectContaining({ projectId: 'project-uuid-1' }),
        'project-service',
      );
    });

    it('debería permitir eliminación por admin', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);
      projectRepo.remove.mockResolvedValue(project);

      await service.deleteProject('project-uuid-1', 'admin-uuid', true);

      expect(projectRepo.remove).toHaveBeenCalled();
    });

    it('debería lanzar ForbiddenException si no es dueño ni admin', async () => {
      const project = createMockProject();
      projectRepo.findOne.mockResolvedValue(project);

      await expect(
        service.deleteProject('project-uuid-1', 'otro-usuario', false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SEARCH PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  describe('searchProjects', () => {
    it('debería retornar proyectos paginados', async () => {
      const projects = [createMockProject()];
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([projects, 1]),
      };
      projectRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.searchProjects({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });

    it('debería aplicar filtros de búsqueda', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      projectRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.searchProjects({
        search: 'nestjs',
        projectType: ProjectType.INTERNSHIP,
        status: ProjectStatus.PUBLISHED,
        locationType: LocationType.REMOTE,
        academicProgram: 'Sistemas',
        skill: 'angular',
        companyId: 'company-uuid-1',
        minimumSemester: 5,
        sortBy: 'views',
        sortOrder: 'ASC',
        page: 2,
        limit: 10,
      });

      // Se espera que andWhere haya sido llamado múltiples veces
      expect(mockQb.andWhere).toHaveBeenCalled();
      expect(mockQb.skip).toHaveBeenCalledWith(10); // (page-1)*limit = 10
      expect(mockQb.take).toHaveBeenCalledWith(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // MY PROJECTS
  // ═══════════════════════════════════════════════════════════════════
  describe('getMyProjects', () => {
    it('debería retornar proyectos del usuario', async () => {
      const projects = [createMockProject()];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([projects, 1]),
      };
      projectRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getMyProjects('user-uuid-1');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(qb.where).toHaveBeenCalledWith('project.createdByUserId = :userId', { userId: 'user-uuid-1' });
    });
  });

  describe('getMyProjectsStats', () => {
    it('debería retornar estadísticas correctas', async () => {
      const projects = [
        createMockProject({ status: ProjectStatus.DRAFT, viewsCount: 10, applicationsCount: 2 }),
        createMockProject({ status: ProjectStatus.PUBLISHED, viewsCount: 25, applicationsCount: 5 }),
        createMockProject({ status: ProjectStatus.IN_PROGRESS, viewsCount: 50, applicationsCount: 8 }),
        createMockProject({ status: ProjectStatus.COMPLETED, viewsCount: 100, applicationsCount: 15 }),
        createMockProject({ status: ProjectStatus.CANCELLED, viewsCount: 5, applicationsCount: 0 }),
      ];
      projectRepo.find.mockResolvedValue(projects);

      const result = await service.getMyProjectsStats('user-uuid-1');

      expect(result.total).toBe(5);
      expect(result.draft).toBe(1);
      expect(result.published).toBe(1);
      expect(result.inProgress).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.cancelled).toBe(1);
      expect(result.totalViews).toBe(190);
      expect(result.totalApplications).toBe(30);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Requirements', () => {
    describe('getRequirements', () => {
      it('debería listar requisitos del proyecto', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const reqs = [createMockRequirement()];
        requirementRepo.find.mockResolvedValue(reqs);

        const result = await service.getRequirements('project-uuid-1');

        expect(result).toHaveLength(1);
        expect(requirementRepo.find).toHaveBeenCalledWith({
          where: { projectId: 'project-uuid-1' },
          order: { displayOrder: 'ASC', createdAt: 'ASC' },
        });
      });
    });

    describe('addRequirement', () => {
      it('debería agregar un requisito', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const req = createMockRequirement();
        requirementRepo.create.mockReturnValue(req);
        requirementRepo.save.mockResolvedValue(req);

        const result = await service.addRequirement('project-uuid-1', 'user-uuid-1', {
          requirementType: RequirementType.SKILL,
          name: 'NestJS',
        });

        expect(result).toBeDefined();
        expect(requirementRepo.create).toHaveBeenCalled();
      });

      it('debería lanzar ForbiddenException si no es el dueño', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);

        await expect(
          service.addRequirement('project-uuid-1', 'otro-usuario', {
            requirementType: RequirementType.SKILL,
            name: 'NestJS',
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('updateRequirement', () => {
      it('debería actualizar un requisito', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const req = createMockRequirement();
        requirementRepo.findOne.mockResolvedValue(req);
        requirementRepo.save.mockResolvedValue({ ...req, name: 'Angular' });

        const result = await service.updateRequirement(
          'project-uuid-1', 'req-uuid-1', 'user-uuid-1', { name: 'Angular' },
        );

        expect(result).toBeDefined();
      });

      it('debería lanzar NotFoundException si el requisito no existe', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        requirementRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateRequirement('project-uuid-1', 'no-existe', 'user-uuid-1', { name: 'X' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteRequirement', () => {
      it('debería eliminar un requisito', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const req = createMockRequirement();
        requirementRepo.findOne.mockResolvedValue(req);
        requirementRepo.remove.mockResolvedValue(req);

        await service.deleteRequirement('project-uuid-1', 'req-uuid-1', 'user-uuid-1');

        expect(requirementRepo.remove).toHaveBeenCalledWith(req);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        requirementRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteRequirement('project-uuid-1', 'no-existe', 'user-uuid-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELIVERABLES
  // ═══════════════════════════════════════════════════════════════════
  describe('Deliverables', () => {
    describe('getDeliverables', () => {
      it('debería listar entregables del proyecto', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const dels = [createMockDeliverable()];
        deliverableRepo.find.mockResolvedValue(dels);

        const result = await service.getDeliverables('project-uuid-1');

        expect(result).toHaveLength(1);
      });
    });

    describe('addDeliverable', () => {
      it('debería agregar un entregable', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const del = createMockDeliverable();
        deliverableRepo.create.mockReturnValue(del);
        deliverableRepo.save.mockResolvedValue(del);

        const result = await service.addDeliverable('project-uuid-1', 'user-uuid-1', {
          title: 'Documento de diseño',
        });

        expect(result).toBeDefined();
      });

      it('debería lanzar ForbiddenException si no es el dueño', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);

        await expect(
          service.addDeliverable('project-uuid-1', 'otro-usuario', { title: 'X' }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('updateDeliverable', () => {
      it('debería actualizar un entregable', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const del = createMockDeliverable();
        deliverableRepo.findOne.mockResolvedValue(del);
        deliverableRepo.save.mockResolvedValue({ ...del, title: 'Nuevo título' });

        const result = await service.updateDeliverable(
          'project-uuid-1', 'del-uuid-1', 'user-uuid-1', { title: 'Nuevo título' },
        );

        expect(result).toBeDefined();
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        deliverableRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateDeliverable('project-uuid-1', 'no-existe', 'user-uuid-1', { title: 'X' }),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteDeliverable', () => {
      it('debería eliminar un entregable', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const del = createMockDeliverable();
        deliverableRepo.findOne.mockResolvedValue(del);
        deliverableRepo.remove.mockResolvedValue(del);

        await service.deleteDeliverable('project-uuid-1', 'del-uuid-1', 'user-uuid-1');

        expect(deliverableRepo.remove).toHaveBeenCalledWith(del);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // HABILIDADES
  // ═══════════════════════════════════════════════════════════════════
  describe('Habilidades', () => {
    describe('addSkill', () => {
      it('debería agregar una habilidad', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        skillRepo.create.mockReturnValue(createMockSkill());
        skillRepo.save.mockResolvedValue(createMockSkill());

        const result = await service.addSkill('project-uuid-1', 'user-uuid-1', {
          name: 'nestjs',
          category: SkillCategory.FRAMEWORK,
        });

        expect(result).toBeDefined();
        expect(skillRepo.create).toHaveBeenCalledTimes(1);
      });
    });

    describe('deleteSkill', () => {
      it('debería eliminar una habilidad', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const skill = createMockSkill();
        skillRepo.findOne.mockResolvedValue(skill);
        skillRepo.remove.mockResolvedValue(skill);

        await service.deleteSkill('project-uuid-1', 'skill-uuid-1', 'user-uuid-1');

        expect(skillRepo.remove).toHaveBeenCalledWith(skill);
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        skillRepo.findOne.mockResolvedValue(null);

        await expect(
          service.deleteSkill('project-uuid-1', 'no-existe', 'user-uuid-1'),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACTIVITIES
  // ═══════════════════════════════════════════════════════════════════
  describe('Activities', () => {
    describe('getActivities', () => {
      it('debería listar actividades del proyecto', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        activityRepo.find.mockResolvedValue([createMockActivity()]);

        const result = await service.getActivities('project-uuid-1');

        expect(result).toHaveLength(1);
      });
    });

    describe('createActivity', () => {
      it('debería crear una actividad', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const activity = createMockActivity();
        activityRepo.create.mockReturnValue(activity);
        activityRepo.save.mockResolvedValue(activity);

        const result = await service.createActivity('project-uuid-1', 'user-uuid-1', {
          title: 'Investigación',
          description: 'Investigar stack tecnológico',
          activityType: 'research',
        });

        expect(result).toBeDefined();
        expect(activityRepo.create).toHaveBeenCalled();
      });

      it('debería lanzar ForbiddenException si no es el dueño', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);

        await expect(
          service.createActivity('project-uuid-1', 'otro-usuario', {
            title: 'X',
            description: 'Desc',
            activityType: 'task',
          }),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('updateActivity', () => {
      it('debería actualizar una actividad', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        const activity = createMockActivity();
        activityRepo.findOne.mockResolvedValue(activity);
        activityRepo.save.mockResolvedValue({ ...activity, title: 'Nuevo título' });

        const result = await service.updateActivity('project-uuid-1', 'act-uuid-1', {
          title: 'Nuevo título',
        });

        expect(result).toBeDefined();
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);
        activityRepo.findOne.mockResolvedValue(null);

        await expect(
          service.updateActivity('project-uuid-1', 'no-existe', { title: 'X' }),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTER-SERVICE
  // ═══════════════════════════════════════════════════════════════════
  describe('Inter-service', () => {
    describe('getMatchingData', () => {
      it('debería retornar datos para matching', async () => {
        const project = createMockProject({
          requirements: [createMockRequirement()],
        });
        projectRepo.findOne.mockResolvedValue(project);

        const result = await service.getMatchingData('project-uuid-1');

        expect(result.projectId).toBe('project-uuid-1');
        expect(result.projectType).toBe(ProjectType.INTERNSHIP);
        expect(result.requirements).toHaveLength(1);
        expect(result.requirements[0].name).toBe('NestJS');
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        projectRepo.findOne.mockResolvedValue(null);

        await expect(service.getMatchingData('no-existe')).rejects.toThrow(NotFoundException);
      });
    });

    describe('projectExists', () => {
      it('debería retornar exists:true con companyId y status si existe', async () => {
        const project = createMockProject();
        projectRepo.findOne.mockResolvedValue(project);

        const result = await service.projectExists('project-uuid-1');

        expect(result.exists).toBe(true);
        expect(result.companyId).toBe('company-uuid-1');
        expect(result.status).toBe(ProjectStatus.DRAFT);
      });

      it('debería retornar exists:false si no existe', async () => {
        projectRepo.findOne.mockResolvedValue(null);

        const result = await service.projectExists('no-existe');

        expect(result.exists).toBe(false);
        expect(result.companyId).toBeNull();
        expect(result.status).toBeNull();
      });
    });

    describe('incrementApplications', () => {
      it('debería incrementar el contador', async () => {
        const project = createMockProject({ applicationsCount: 5 });
        projectRepo.findOne.mockResolvedValue(project);
        projectRepo.save.mockResolvedValue({ ...project, applicationsCount: 6 });

        await service.incrementApplications('project-uuid-1');

        expect(projectRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ applicationsCount: 6 }),
        );
      });

      it('debería lanzar NotFoundException si no existe', async () => {
        projectRepo.findOne.mockResolvedValue(null);

        await expect(service.incrementApplications('no-existe')).rejects.toThrow(NotFoundException);
      });
    });
  });
});

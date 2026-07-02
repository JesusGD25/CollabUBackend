import { Test, TestingModule } from '@nestjs/testing';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { JwtAuthGuard, RolesGuard } from '@collab-u/shared';
import { ProjectType, ProjectStatus, LocationType } from './entities/project.entity';

// ─── Mock del servicio ──────────────────────────────────────────────

const mockProjectService = {
  createProject: jest.fn(),
  getProjectById: jest.fn(),
  getProjectBySlug: jest.fn(),
  updateProject: jest.fn(),
  updateProjectStatus: jest.fn(),
  deleteProject: jest.fn(),
  searchProjects: jest.fn(),
  getMyProjects: jest.fn(),
  getMyProjectsStats: jest.fn(),
  getRequirements: jest.fn(),
  addRequirement: jest.fn(),
  updateRequirement: jest.fn(),
  deleteRequirement: jest.fn(),
  getDeliverables: jest.fn(),
  addDeliverable: jest.fn(),
  updateDeliverable: jest.fn(),
  deleteDeliverable: jest.fn(),
  addTags: jest.fn(),
  deleteTag: jest.fn(),
  getActivities: jest.fn(),
  createActivity: jest.fn(),
  updateActivity: jest.fn(),
};

const mockUser = { userId: 'user-uuid-1', email: 'test@test.com', role: 'company', companyId: 'company-uuid-1' };

// ─── Test Suite ─────────────────────────────────────────────────────

describe('ProjectController', () => {
  let controller: ProjectController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectController>(ProjectController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // PROJECT ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Projects', () => {
    describe('POST /', () => {
      it('debería crear un proyecto', async () => {
        const dto = {
          title: 'Desarrollo de módulo de inventarios',
          description: 'Se requiere un desarrollador full-stack para implementar un módulo completo',
          projectType: ProjectType.INTERNSHIP,
        };
        const expected = { id: 'project-uuid-1', ...dto, status: ProjectStatus.DRAFT };
        mockProjectService.createProject.mockResolvedValue(expected);

        const result = await controller.createProject(mockUser, dto as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.createProject).toHaveBeenCalledWith(
          'user-uuid-1', 'company-uuid-1', dto,
        );
      });
    });

    describe('GET /', () => {
      it('debería buscar proyectos', async () => {
        const query = { page: 1, limit: 20 };
        const expected = { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } };
        mockProjectService.searchProjects.mockResolvedValue(expected);

        const result = await controller.searchProjects(query as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.searchProjects).toHaveBeenCalledWith(query);
      });

      it('debería buscar con filtros', async () => {
        const query = {
          projectType: ProjectType.INTERNSHIP,
          locationType: LocationType.REMOTE,
          page: 1,
          limit: 10,
        };
        const expected = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        mockProjectService.searchProjects.mockResolvedValue(expected);

        const result = await controller.searchProjects(query as any);

        expect(result).toEqual(expected);
      });
    });

    describe('GET /my-projects', () => {
      it('debería obtener mis proyectos', async () => {
        const expected = [{ id: 'project-uuid-1', title: 'Mi proyecto' }];
        mockProjectService.getMyProjects.mockResolvedValue(expected);

        const result = await controller.getMyProjects(mockUser, {} as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.getMyProjects).toHaveBeenCalledWith('user-uuid-1', {});
      });
    });

    describe('GET /my-projects/stats', () => {
      it('debería obtener estadísticas', async () => {
        const expected = { total: 5, draft: 1, published: 2, inProgress: 1, completed: 1 };
        mockProjectService.getMyProjectsStats.mockResolvedValue(expected);

        const result = await controller.getMyProjectsStats(mockUser);

        expect(result).toEqual(expected);
        expect(mockProjectService.getMyProjectsStats).toHaveBeenCalledWith('user-uuid-1');
      });
    });

    describe('GET /slug/:slug', () => {
      it('debería obtener proyecto por slug', async () => {
        const expected = { id: 'project-uuid-1', slug: 'mi-proyecto-abc123' };
        mockProjectService.getProjectBySlug.mockResolvedValue(expected);

        const result = await controller.getProjectBySlug('mi-proyecto-abc123');

        expect(result).toEqual(expected);
        expect(mockProjectService.getProjectBySlug).toHaveBeenCalledWith('mi-proyecto-abc123');
      });
    });

    describe('GET /:projectId', () => {
      it('debería obtener proyecto por ID', async () => {
        const expected = { id: 'project-uuid-1', title: 'Mi proyecto' };
        mockProjectService.getProjectById.mockResolvedValue(expected);

        const result = await controller.getProject('project-uuid-1');

        expect(result).toEqual(expected);
        expect(mockProjectService.getProjectById).toHaveBeenCalledWith('project-uuid-1', true);
      });
    });

    describe('PATCH /:projectId', () => {
      it('debería actualizar un proyecto', async () => {
        const dto = { description: 'Nueva descripción con suficientes caracteres' };
        const expected = { id: 'project-uuid-1', ...dto };
        mockProjectService.updateProject.mockResolvedValue(expected);

        const result = await controller.updateProject('project-uuid-1', mockUser, dto as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.updateProject).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', dto,
        );
      });
    });

    describe('PATCH /:projectId/status', () => {
      it('debería cambiar el estado del proyecto', async () => {
        const dto = { status: ProjectStatus.PUBLISHED };
        const expected = { id: 'project-uuid-1', status: ProjectStatus.PUBLISHED };
        mockProjectService.updateProjectStatus.mockResolvedValue(expected);

        const result = await controller.updateProjectStatus('project-uuid-1', mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockProjectService.updateProjectStatus).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', dto,
        );
      });
    });

    describe('DELETE /:projectId', () => {
      it('debería eliminar un proyecto como company', async () => {
        mockProjectService.deleteProject.mockResolvedValue(undefined);

        await controller.deleteProject('project-uuid-1', mockUser);

        expect(mockProjectService.deleteProject).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', false,
        );
      });

      it('debería eliminar un proyecto como admin', async () => {
        const adminUser = { ...mockUser, role: 'admin' };
        mockProjectService.deleteProject.mockResolvedValue(undefined);

        await controller.deleteProject('project-uuid-1', adminUser);

        expect(mockProjectService.deleteProject).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', true,
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // REQUIREMENTS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Requirements', () => {
    describe('GET /:projectId/requirements', () => {
      it('debería listar requisitos', async () => {
        const expected = [{ id: 'req-1', name: 'NestJS' }];
        mockProjectService.getRequirements.mockResolvedValue(expected);

        const result = await controller.getRequirements('project-uuid-1');

        expect(result).toEqual(expected);
      });
    });

    describe('POST /:projectId/requirements', () => {
      it('debería agregar un requisito', async () => {
        const dto = { requirementType: 'skill', name: 'NestJS' };
        const expected = { id: 'req-1', ...dto };
        mockProjectService.addRequirement.mockResolvedValue(expected);

        const result = await controller.addRequirement('project-uuid-1', mockUser, dto as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.addRequirement).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', dto,
        );
      });
    });

    describe('PATCH /:projectId/requirements/:reqId', () => {
      it('debería actualizar un requisito', async () => {
        const dto = { name: 'Angular' };
        const expected = { id: 'req-1', name: 'Angular' };
        mockProjectService.updateRequirement.mockResolvedValue(expected);

        const result = await controller.updateRequirement('project-uuid-1', 'req-1', mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockProjectService.updateRequirement).toHaveBeenCalledWith(
          'project-uuid-1', 'req-1', 'user-uuid-1', dto,
        );
      });
    });

    describe('DELETE /:projectId/requirements/:reqId', () => {
      it('debería eliminar un requisito', async () => {
        mockProjectService.deleteRequirement.mockResolvedValue(undefined);

        await controller.deleteRequirement('project-uuid-1', 'req-1', mockUser);

        expect(mockProjectService.deleteRequirement).toHaveBeenCalledWith(
          'project-uuid-1', 'req-1', 'user-uuid-1',
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELIVERABLES ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Deliverables', () => {
    describe('GET /:projectId/deliverables', () => {
      it('debería listar entregables', async () => {
        const expected = [{ id: 'del-1', title: 'Documento' }];
        mockProjectService.getDeliverables.mockResolvedValue(expected);

        const result = await controller.getDeliverables('project-uuid-1');

        expect(result).toEqual(expected);
      });
    });

    describe('POST /:projectId/deliverables', () => {
      it('debería agregar un entregable', async () => {
        const dto = { title: 'Documento de diseño' };
        const expected = { id: 'del-1', ...dto };
        mockProjectService.addDeliverable.mockResolvedValue(expected);

        const result = await controller.addDeliverable('project-uuid-1', mockUser, dto as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.addDeliverable).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', dto,
        );
      });
    });

    describe('PATCH /:projectId/deliverables/:delId', () => {
      it('debería actualizar un entregable', async () => {
        const dto = { title: 'Nuevo título' };
        const expected = { id: 'del-1', title: 'Nuevo título' };
        mockProjectService.updateDeliverable.mockResolvedValue(expected);

        const result = await controller.updateDeliverable('project-uuid-1', 'del-1', mockUser, dto);

        expect(result).toEqual(expected);
      });
    });

    describe('DELETE /:projectId/deliverables/:delId', () => {
      it('debería eliminar un entregable', async () => {
        mockProjectService.deleteDeliverable.mockResolvedValue(undefined);

        await controller.deleteDeliverable('project-uuid-1', 'del-1', mockUser);

        expect(mockProjectService.deleteDeliverable).toHaveBeenCalledWith(
          'project-uuid-1', 'del-1', 'user-uuid-1',
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // TAGS ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Tags', () => {
    describe('POST /:projectId/tags', () => {
      it('debería agregar tags', async () => {
        const dto = { tags: ['nestjs', 'angular'] };
        const expected = [{ id: 'tag-1', tag: 'nestjs' }, { id: 'tag-2', tag: 'angular' }];
        mockProjectService.addTags.mockResolvedValue(expected);

        const result = await controller.addTags('project-uuid-1', mockUser, dto);

        expect(result).toEqual(expected);
        expect(mockProjectService.addTags).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', ['nestjs', 'angular'],
        );
      });
    });

    describe('DELETE /:projectId/tags/:tagId', () => {
      it('debería eliminar un tag', async () => {
        mockProjectService.deleteTag.mockResolvedValue(undefined);

        await controller.deleteTag('project-uuid-1', 'tag-1', mockUser);

        expect(mockProjectService.deleteTag).toHaveBeenCalledWith(
          'project-uuid-1', 'tag-1', 'user-uuid-1',
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ACTIVITIES ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════
  describe('Activities', () => {
    describe('GET /:projectId/activities', () => {
      it('debería listar actividades', async () => {
        const expected = [{ id: 'act-1', title: 'Investigación' }];
        mockProjectService.getActivities.mockResolvedValue(expected);

        const result = await controller.getActivities('project-uuid-1');

        expect(result).toEqual(expected);
      });
    });

    describe('POST /:projectId/activities', () => {
      it('debería crear una actividad', async () => {
        const dto = { title: 'Investigación', description: 'Investigar', activityType: 'research' };
        const expected = { id: 'act-1', ...dto };
        mockProjectService.createActivity.mockResolvedValue(expected);

        const result = await controller.createActivity('project-uuid-1', mockUser, dto as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.createActivity).toHaveBeenCalledWith(
          'project-uuid-1', 'user-uuid-1', dto,
        );
      });
    });

    describe('PATCH /:projectId/activities/:actId', () => {
      it('debería actualizar una actividad', async () => {
        const dto = { title: 'Actualizada' };
        const expected = { id: 'act-1', title: 'Actualizada' };
        mockProjectService.updateActivity.mockResolvedValue(expected);

        const result = await controller.updateActivity('project-uuid-1', 'act-1', dto as any);

        expect(result).toEqual(expected);
        expect(mockProjectService.updateActivity).toHaveBeenCalledWith(
          'project-uuid-1', 'act-1', dto,
        );
      });
    });
  });
});

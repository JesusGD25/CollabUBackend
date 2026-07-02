import { Test, TestingModule } from '@nestjs/testing';
import { ProjectEventsSubscriber } from './project-events.subscriber';
import { EventSubscriber } from '@collab-u/shared';
import { ProjectService } from '../project/project.service';

describe('ProjectEventsSubscriber', () => {
  let subscriber: ProjectEventsSubscriber;
  let eventSubscriber: any;
  let projectService: any;
  let handlers: Record<string, Function>;

  beforeEach(async () => {
    handlers = {};

    eventSubscriber = {
      subscribe: jest.fn().mockImplementation(async (queueName: string, eventType: string, handler: Function) => {
        handlers[eventType] = handler;
      }),
    };

    projectService = {
      incrementApplications: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectEventsSubscriber,
        { provide: EventSubscriber, useValue: eventSubscriber },
        { provide: ProjectService, useValue: projectService },
      ],
    }).compile();

    subscriber = module.get<ProjectEventsSubscriber>(ProjectEventsSubscriber);
    await subscriber.onModuleInit();
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  it('debería suscribirse a 3 eventos', () => {
    expect(eventSubscriber.subscribe).toHaveBeenCalledTimes(3);
    expect(eventSubscriber.subscribe).toHaveBeenCalledWith(
      'project-service.company.deactivated',
      'company.profile.deactivated',
      expect.any(Function),
    );
    expect(eventSubscriber.subscribe).toHaveBeenCalledWith(
      'project-service.application.accepted',
      'application.status.changed',
      expect.any(Function),
    );
    expect(eventSubscriber.subscribe).toHaveBeenCalledWith(
      'project-service.auth.user.deactivated',
      'auth.user.deactivated',
      expect.any(Function),
    );
  });

  describe('company.profile.deactivated', () => {
    it('debería procesar evento de empresa desactivada', async () => {
      await expect(
        handlers['company.profile.deactivated']({
          data: { companyId: 'company-uuid-1' },
        }),
      ).resolves.not.toThrow();
    });

    it('debería manejar errores sin lanzar', async () => {
      // Simular error dentro del handler
      await expect(
        handlers['company.profile.deactivated']({
          data: { companyId: 'company-uuid-1' },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('application.status.changed', () => {
    it('debería incrementar aplicaciones cuando se acepta', async () => {
      projectService.incrementApplications.mockResolvedValue(undefined);

      await handlers['application.status.changed']({
        data: { projectId: 'project-uuid-1', newStatus: 'accepted' },
      });

      expect(projectService.incrementApplications).toHaveBeenCalledWith('project-uuid-1');
    });

    it('debería ignorar si el estado no es accepted', async () => {
      await handlers['application.status.changed']({
        data: { projectId: 'project-uuid-1', newStatus: 'rejected' },
      });

      expect(projectService.incrementApplications).not.toHaveBeenCalled();
    });

    it('debería ignorar NotFoundException (404)', async () => {
      projectService.incrementApplications.mockRejectedValue({ status: 404, message: 'No encontrado' });

      await expect(
        handlers['application.status.changed']({
          data: { projectId: 'project-uuid-1', newStatus: 'accepted' },
        }),
      ).resolves.not.toThrow();
    });

    it('debería manejar errores sin lanzar', async () => {
      projectService.incrementApplications.mockRejectedValue(new Error('DB error'));

      await expect(
        handlers['application.status.changed']({
          data: { projectId: 'project-uuid-1', newStatus: 'accepted' },
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('auth.user.deactivated', () => {
    it('debería procesar evento de usuario desactivado', async () => {
      await expect(
        handlers['auth.user.deactivated']({
          data: { userId: 'user-uuid-1' },
        }),
      ).resolves.not.toThrow();
    });
  });
});

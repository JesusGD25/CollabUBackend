import { Test, TestingModule } from '@nestjs/testing';
import { EventSubscriber } from '@collab-u/shared';
import { StudentEventsSubscriber } from './student-events.subscriber';
import { StudentService } from '../student/student.service';

const mockEventSubscriber = {
  subscribe: jest.fn(),
};

const mockStudentService = {
  createProfile: jest.fn(),
  updateProfile: jest.fn(),
};

describe('StudentEventsSubscriber', () => {
  let subscriber: StudentEventsSubscriber;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentEventsSubscriber,
        { provide: EventSubscriber, useValue: mockEventSubscriber },
        { provide: StudentService, useValue: mockStudentService },
      ],
    }).compile();

    subscriber = module.get<StudentEventsSubscriber>(StudentEventsSubscriber);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('debería suscribirse a auth.user.created y auth.user.deactivated', async () => {
      mockEventSubscriber.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'student-service.auth.user.created',
        'auth.user.created',
        expect.any(Function),
      );
      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'student-service.auth.user.deactivated',
        'auth.user.deactivated',
        expect.any(Function),
      );
    });

    it('debería crear perfil base cuando se recibe evento con role=student', async () => {
      let createdHandler!: Function;
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, pattern: string, handler: Function) => {
          if (pattern === 'auth.user.created') {
            createdHandler = handler;
          }
        },
      );

      await subscriber.onModuleInit();

      mockStudentService.createProfile.mockResolvedValue({ id: 'profile-1' });
      await createdHandler({ data: { userId: 'new-user', role: 'student' } });

      expect(mockStudentService.createProfile).toHaveBeenCalledWith({
        userId: 'new-user',
        program: '',
        semester: 1,
      });
    });

    it('debería ignorar eventos con role diferente a student', async () => {
      let createdHandler!: Function;
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, pattern: string, handler: Function) => {
          if (pattern === 'auth.user.created') {
            createdHandler = handler;
          }
        },
      );

      await subscriber.onModuleInit();
      await createdHandler({ data: { userId: 'company-user', role: 'company' } });

      expect(mockStudentService.createProfile).not.toHaveBeenCalled();
    });

    it('debería ocultar perfil cuando se desactiva usuario', async () => {
      let deactivatedHandler!: Function;
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, pattern: string, handler: Function) => {
          if (pattern === 'auth.user.deactivated') {
            deactivatedHandler = handler;
          }
        },
      );

      await subscriber.onModuleInit();

      mockStudentService.updateProfile.mockResolvedValue({});
      await deactivatedHandler({ data: { userId: 'deactivated-user' } });

      expect(mockStudentService.updateProfile).toHaveBeenCalledWith('deactivated-user', { isVisible: false });
    });

    it('debería manejar errores sin propagarlos', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_q: string, pattern: string, handler: Function) => {
          if (pattern === 'auth.user.created') {
            await handler({ data: { userId: 'err-user', role: 'student' } });
          }
        },
      );
      mockStudentService.createProfile.mockRejectedValue(new Error('DB error'));

      await expect(subscriber.onModuleInit()).resolves.not.toThrow();
    });

    it('debería ignorar ConflictException (409) al crear perfil duplicado', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_q: string, pattern: string, handler: Function) => {
          if (pattern === 'auth.user.created') {
            await handler({ data: { userId: 'dup-user', role: 'student' } });
          }
        },
      );
      mockStudentService.createProfile.mockRejectedValue({ status: 409, message: 'Ya existe' });

      await expect(subscriber.onModuleInit()).resolves.not.toThrow();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { EventSubscriber } from '@collab-u/shared';
import { UserEventsSubscriber } from './user-events.subscriber';
import { UsersService } from '../users/users.service';

const mockEventSubscriber = {
  subscribe: jest.fn(),
};

const mockUsersService = {
  createProfile: jest.fn(),
  setOnboardingStatus: jest.fn(),
};

describe('UserEventsSubscriber', () => {
  let subscriber: UserEventsSubscriber;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEventsSubscriber,
        { provide: EventSubscriber, useValue: mockEventSubscriber },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    subscriber = module.get<UserEventsSubscriber>(UserEventsSubscriber);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('debería suscribirse a auth.user.verified y eventos de progreso por rol', async () => {
      mockEventSubscriber.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'user-service.auth.user.verified',
        'auth.user.verified',
        expect.any(Function),
      );
      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'user-service.student.profile.updated',
        'student.profile.updated',
        expect.any(Function),
      );
      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'user-service.company.profile.updated',
        'company.profile.updated',
        expect.any(Function),
      );
    });

    it('debería crear un perfil base cuando se recibe el evento', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, pattern: string, handler: (event: any) => Promise<void>) => {
          if (pattern !== 'auth.user.verified') {
            return;
          }

          await handler({
            data: {
              userId: 'new-user-uuid',
              email: 'nuevo@udenar.edu.co',
              role: 'student',
            },
          });
        },
      );
      mockUsersService.createProfile.mockResolvedValue({ id: 'profile-1' });

      await subscriber.onModuleInit();

      expect(mockUsersService.createProfile).toHaveBeenCalledWith({
        userId: 'new-user-uuid',
        role: 'student',
        firstName: '',
        lastName: '',
      });
    });

    it('debería manejar errores sin propagarlos', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_q: string, pattern: string, handler: (event: any) => Promise<void>) => {
          if (pattern !== 'auth.user.verified') {
            return;
          }

          await handler({
            data: { userId: 'err-user', email: 'err@x.co', role: 'student' },
          });
        },
      );
      mockUsersService.createProfile.mockRejectedValue(new Error('DB error'));

      // No debería lanzar excepción
      await expect(subscriber.onModuleInit()).resolves.not.toThrow();
    });

    it('debería actualizar onboarding con eventos de progreso de estudiante', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, pattern: string, handler: (event: any) => Promise<void>) => {
          if (pattern !== 'student.profile.updated') {
            return;
          }

          await handler({
            data: { userId: 'student-user-1', isOnboardingReady: true },
          });
        },
      );
      mockUsersService.setOnboardingStatus.mockResolvedValue({ id: 'profile-1' });

      await subscriber.onModuleInit();

      expect(mockUsersService.setOnboardingStatus).toHaveBeenCalledWith('student-user-1', true);
    });
  });
});

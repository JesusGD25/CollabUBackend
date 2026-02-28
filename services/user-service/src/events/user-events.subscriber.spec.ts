import { Test, TestingModule } from '@nestjs/testing';
import { EventSubscriber } from '@collab-u/shared';
import { UserEventsSubscriber } from './user-events.subscriber';
import { UsersService } from '../users/users.service';

const mockEventSubscriber = {
  subscribe: jest.fn(),
};

const mockUsersService = {
  createProfile: jest.fn(),
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
    it('debería suscribirse al evento auth.user.created', async () => {
      mockEventSubscriber.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'user-service.auth.user.created',
        'auth.user.created',
        expect.any(Function),
      );
    });

    it('debería crear un perfil base cuando se recibe el evento', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, _pattern: string, handler: (event: any) => Promise<void>) => {
          // Simular recepción del evento
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
        async (_q: string, _p: string, handler: (event: any) => Promise<void>) => {
          await handler({
            data: { userId: 'err-user', email: 'err@x.co', role: 'student' },
          });
        },
      );
      mockUsersService.createProfile.mockRejectedValue(new Error('DB error'));

      // No debería lanzar excepción
      await expect(subscriber.onModuleInit()).resolves.not.toThrow();
    });
  });
});

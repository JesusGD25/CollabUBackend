import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationEventsSubscriber } from './application-events.subscriber';
import { ApplicationService } from './application.service';
import { EventSubscriber } from '@collab-u/shared';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockApplicationService = {
  withdrawAllByStudent: jest.fn().mockResolvedValue(undefined),
};

const mockEventSubscriber = {
  subscribe: jest.fn(),
};

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('ApplicationEventsSubscriber', () => {
  let subscriber: ApplicationEventsSubscriber;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationEventsSubscriber,
        { provide: ApplicationService, useValue: mockApplicationService },
        { provide: EventSubscriber, useValue: mockEventSubscriber },
      ],
    }).compile();

    subscriber = module.get<ApplicationEventsSubscriber>(ApplicationEventsSubscriber);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(subscriber).toBeDefined());

  describe('onModuleInit', () => {
    it('debería suscribirse a auth.user.deactivated al inicializar', () => {
      subscriber.onModuleInit();
      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'application-service.auth.user.deactivated',
        'auth.user.deactivated',
        expect.any(Function),
      );
    });

    it('debería llamar withdrawAllByStudent cuando recibe el evento', async () => {
      let capturedHandler: (data: any) => Promise<void> = async () => {};

      mockEventSubscriber.subscribe.mockImplementation(
        (_queue: string, _routing: string, handler: (data: any) => Promise<void>) => {
          capturedHandler = handler;
        },
      );

      subscriber.onModuleInit();

      await capturedHandler({
        eventId: 'evt-1',
        eventType: 'auth.user.deactivated',
        timestamp: new Date().toISOString(),
        source: 'auth-service',
        data: { userId: 'user-uuid-1' },
      });

      expect(mockApplicationService.withdrawAllByStudent).toHaveBeenCalledWith('user-uuid-1');
    });

    it('debería no lanzar error si withdrawAllByStudent falla', async () => {
      let capturedHandler: (data: any) => Promise<void> = async () => {};

      mockEventSubscriber.subscribe.mockImplementation(
        (_queue: string, _routing: string, handler: (data: any) => Promise<void>) => {
          capturedHandler = handler;
        },
      );

      mockApplicationService.withdrawAllByStudent.mockRejectedValue(
        new Error('DB error'),
      );

      subscriber.onModuleInit();

      // No debe lanzar excepción
      await expect(capturedHandler({
        eventId: 'evt-1',
        eventType: 'auth.user.deactivated',
        timestamp: new Date().toISOString(),
        source: 'auth-service',
        data: { userId: 'user-uuid-1' },
      })).resolves.not.toThrow();
    });
  });
});

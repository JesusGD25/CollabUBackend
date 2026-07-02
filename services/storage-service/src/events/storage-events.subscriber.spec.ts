import { Test, TestingModule } from '@nestjs/testing';
import { EventSubscriber } from '@collab-u/shared';
import { StorageEventsSubscriber } from './storage-events.subscriber';
import { StorageService } from '../storage/storage.service';

const mockEventSubscriber = {
  subscribe: jest.fn(),
};

const mockStorageService = {
  initializeQuota: jest.fn(),
};

describe('StorageEventsSubscriber', () => {
  let subscriber: StorageEventsSubscriber;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageEventsSubscriber,
        { provide: EventSubscriber, useValue: mockEventSubscriber },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    subscriber = module.get<StorageEventsSubscriber>(StorageEventsSubscriber);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('debería suscribirse a auth.user.created', async () => {
      mockEventSubscriber.subscribe.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(mockEventSubscriber.subscribe).toHaveBeenCalledWith(
        'storage-service.auth.user.created',
        'auth.user.created',
        expect.any(Function),
      );
    });

    it('debería inicializar cuota cuando se recibe evento', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_queue: string, _pattern: string, handler: (event: any) => Promise<void>) => {
          await handler({
            data: { userId: 'new-user-uuid', role: 'student' },
          });
        },
      );
      mockStorageService.initializeQuota.mockResolvedValue(undefined);

      await subscriber.onModuleInit();

      expect(mockStorageService.initializeQuota).toHaveBeenCalledWith('new-user-uuid', 'student');
    });

    it('debería manejar errores sin propagarlos', async () => {
      mockEventSubscriber.subscribe.mockImplementation(
        async (_q: string, _p: string, handler: (event: any) => Promise<void>) => {
          await handler({ data: { userId: 'err-user', role: 'student' } });
        },
      );
      mockStorageService.initializeQuota.mockRejectedValue(new Error('DB error'));

      await expect(subscriber.onModuleInit()).resolves.not.toThrow();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CompanyEventsSubscriber } from './company-events.subscriber';
import { EventSubscriber } from '@collab-u/shared';
import { CompanyService } from '../company/company.service';
import { VerificationStatus } from '../company/entities/company-profile.entity';

describe('CompanyEventsSubscriber', () => {
  let subscriber: CompanyEventsSubscriber;
  let eventSubscriber: any;
  let companyService: any;
  let handlers: Record<string, Function>;

  beforeEach(async () => {
    handlers = {};

    eventSubscriber = {
      subscribe: jest.fn().mockImplementation(async (queueName: string, eventType: string, handler: Function) => {
        handlers[eventType] = handler;
      }),
    };

    companyService = {
      createProfile: jest.fn(),
      updateVerificationStatus: jest.fn(),
      updateProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyEventsSubscriber,
        { provide: EventSubscriber, useValue: eventSubscriber },
        { provide: CompanyService, useValue: companyService },
      ],
    }).compile();

    subscriber = module.get<CompanyEventsSubscriber>(CompanyEventsSubscriber);
    await subscriber.onModuleInit();
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(subscriber).toBeDefined();
  });

  it('debería suscribirse a 3 eventos', () => {
    expect(eventSubscriber.subscribe).toHaveBeenCalledTimes(3);
    expect(eventSubscriber.subscribe).toHaveBeenCalledWith(
      'company-service.auth.user.verified',
      'auth.user.verified',
      expect.any(Function),
    );
    expect(eventSubscriber.subscribe).toHaveBeenCalledWith(
      'company-service.admin.company.verified',
      'admin.company.verified',
      expect.any(Function),
    );
    expect(eventSubscriber.subscribe).toHaveBeenCalledWith(
      'company-service.auth.user.deactivated',
      'auth.user.deactivated',
      expect.any(Function),
    );
  });

  // ═══════════════════════════════════════════════════════════════════
  // auth.user.verified
  // ═══════════════════════════════════════════════════════════════════
  describe('auth.user.verified', () => {
    it('debería crear perfil base cuando el rol es company', async () => {
      companyService.createProfile.mockResolvedValue({});

      await handlers['auth.user.verified']({
        data: { userId: 'user-uuid-1', role: 'company' },
      });

      expect(companyService.createProfile).toHaveBeenCalledWith({
        userId: 'user-uuid-1',
        companyName: 'Empresa pendiente de configurar',
      });
    });

    it('debería ignorar si el rol no es company', async () => {
      await handlers['auth.user.verified']({
        data: { userId: 'user-uuid-1', role: 'student' },
      });

      expect(companyService.createProfile).not.toHaveBeenCalled();
    });

    it('debería ignorar ConflictException (409)', async () => {
      companyService.createProfile.mockRejectedValue({ status: 409, message: 'Ya existe' });

      await expect(
        handlers['auth.user.verified']({
          data: { userId: 'user-uuid-1', role: 'company' },
        }),
      ).resolves.not.toThrow();
    });

    it('debería loguear error no-409', async () => {
      companyService.createProfile.mockRejectedValue(new Error('DB error'));

      await expect(
        handlers['auth.user.verified']({
          data: { userId: 'user-uuid-1', role: 'company' },
        }),
      ).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // admin.company.verified
  // ═══════════════════════════════════════════════════════════════════
  describe('admin.company.verified', () => {
    it('debería actualizar el estado de verificación', async () => {
      companyService.updateVerificationStatus.mockResolvedValue(undefined);

      await handlers['admin.company.verified']({
        data: { userId: 'user-uuid-1', status: VerificationStatus.VERIFIED },
      });

      expect(companyService.updateVerificationStatus).toHaveBeenCalledWith(
        'user-uuid-1',
        VerificationStatus.VERIFIED,
      );
    });

    it('debería ignorar NotFoundException (404)', async () => {
      companyService.updateVerificationStatus.mockRejectedValue({ status: 404, message: 'No encontrado' });

      await expect(
        handlers['admin.company.verified']({
          data: { userId: 'user-uuid-1', status: VerificationStatus.VERIFIED },
        }),
      ).resolves.not.toThrow();
    });

    it('debería loguear error no-404', async () => {
      companyService.updateVerificationStatus.mockRejectedValue(new Error('DB error'));

      await expect(
        handlers['admin.company.verified']({
          data: { userId: 'user-uuid-1', status: VerificationStatus.VERIFIED },
        }),
      ).resolves.not.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // auth.user.deactivated
  // ═══════════════════════════════════════════════════════════════════
  describe('auth.user.deactivated', () => {
    it('debería desactivar el perfil', async () => {
      companyService.updateProfile.mockResolvedValue({});

      await handlers['auth.user.deactivated']({
        data: { userId: 'user-uuid-1' },
      });

      expect(companyService.updateProfile).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ isActive: false }),
      );
    });

    it('debería ignorar NotFoundException (404)', async () => {
      companyService.updateProfile.mockRejectedValue({ status: 404, message: 'No encontrado' });

      await expect(
        handlers['auth.user.deactivated']({
          data: { userId: 'user-uuid-1' },
        }),
      ).resolves.not.toThrow();
    });

    it('debería loguear error no-404', async () => {
      companyService.updateProfile.mockRejectedValue(new Error('DB error'));

      await expect(
        handlers['auth.user.deactivated']({
          data: { userId: 'user-uuid-1' },
        }),
      ).resolves.not.toThrow();
    });
  });
});

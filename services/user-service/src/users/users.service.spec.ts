import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository, In } from 'typeorm';

import { EventPublisher } from '@collab-u/shared';

import { UsersService } from './users.service';
import { UserProfile } from './entities/user-profile.entity';
import { UserSettings, UiTheme, UiLanguage, ProfileVisibility } from './entities/user-settings.entity';
import { ActivityLog, ActivityType } from './entities/activity-log.entity';

// ─── Mocks ──────────────────────────────────────────────────────────

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockProfileRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockSettingsRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockActivityLogRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
});

// ─── Helpers ────────────────────────────────────────────────────────

function createMockProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-uuid-1',
    userId: 'user-uuid-1',
    role: 'student',
    firstName: 'Juan',
    lastName: 'Pérez',
    phone: null,
    phoneCountryCode: null,
    avatarUrl: null,
    dateOfBirth: null,
    gender: null,
    bio: null,
    city: null,
    department: null,
    country: 'Colombia',
    address: null,
    websiteUrl: null,
    linkedinUrl: null,
    profileCompleteness: 18,
    isOnboardingComplete: false,
    lastActiveAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: null as any,
    ...overrides,
  } as UserProfile;
}

function createMockSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    id: 'settings-uuid-1',
    userId: 'user-uuid-1',
    theme: UiTheme.SYSTEM,
    language: UiLanguage.ES,
    profileVisibility: ProfileVisibility.REGISTERED,
    emailNotifications: true,
    pushNotifications: true,
    applicationUpdates: true,
    newMatches: true,
    messages: true,
    evaluationReminders: true,
    marketingEmails: false,
    timezone: 'America/Bogota',
    dateFormat: 'DD/MM/YYYY',
    createdAt: new Date(),
    updatedAt: new Date(),
    userProfile: null as any,
    ...overrides,
  } as UserSettings;
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let profileRepo: jest.Mocked<Repository<UserProfile>>;
  let settingsRepo: jest.Mocked<Repository<UserSettings>>;
  let activityLogRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserProfile), useFactory: mockProfileRepo },
        { provide: getRepositoryToken(UserSettings), useFactory: mockSettingsRepo },
        { provide: getRepositoryToken(ActivityLog), useFactory: mockActivityLogRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    profileRepo = module.get(getRepositoryToken(UserProfile));
    settingsRepo = module.get(getRepositoryToken(UserSettings));
    activityLogRepo = module.get(getRepositoryToken(ActivityLog));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // CREATE PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('createProfile', () => {
    const dto = { userId: 'user-uuid-1', role: 'student', firstName: 'Juan', lastName: 'Pérez' };

    it('debería crear un perfil y settings por defecto', async () => {
      profileRepo.findOne
        .mockResolvedValueOnce(null) // no existe
        .mockResolvedValueOnce(createMockProfile({ settings: createMockSettings() })); // findOne con relations
      profileRepo.create.mockReturnValue(createMockProfile());
      profileRepo.save.mockResolvedValue(createMockProfile());
      settingsRepo.create.mockReturnValue(createMockSettings());
      settingsRepo.save.mockResolvedValue(createMockSettings());

      const result = await service.createProfile(dto);

      expect(result).toBeDefined();
      expect(profileRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: dto.userId, role: dto.role }),
      );
      expect(settingsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: dto.userId }),
      );
    });

    it('debería lanzar ConflictException si el perfil ya existe', async () => {
      profileRepo.findOne.mockResolvedValue(createMockProfile());

      await expect(service.createProfile(dto)).rejects.toThrow(ConflictException);
      expect(profileRepo.save).not.toHaveBeenCalled();
    });

    it('debería calcular profileCompleteness al crear', async () => {
      const profile = createMockProfile({ firstName: 'Juan', lastName: 'Pérez' });
      profileRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(profile);
      profileRepo.create.mockReturnValue(profile);
      profileRepo.save.mockResolvedValue(profile);
      settingsRepo.create.mockReturnValue(createMockSettings());
      settingsRepo.save.mockResolvedValue(createMockSettings());

      await service.createProfile(dto);

      // El profile.profileCompleteness debería haber sido calculado antes de save
      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ profileCompleteness: expect.any(Number) }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfile', () => {
    it('debería retornar el perfil con settings', async () => {
      const profile = createMockProfile({ settings: createMockSettings() });
      profileRepo.findOne.mockResolvedValue(profile);
      profileRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.getProfile('user-uuid-1');

      expect(result).toEqual(profile);
      expect(profileRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        relations: ['settings'],
      });
      // Debe actualizar lastActiveAt
      expect(profileRepo.update).toHaveBeenCalledWith(profile.id, {
        lastActiveAt: expect.any(Date),
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET PROFILE BY ID
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfileById', () => {
    it('debería retornar el perfil de otro usuario', async () => {
      const profile = createMockProfile({ userId: 'other-user' });
      profileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getProfileById('other-user');

      expect(result.userId).toBe('other-user');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getProfileById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE PROFILE
  // ═══════════════════════════════════════════════════════════════════
  describe('updateProfile', () => {
    it('debería actualizar el perfil y recalcular completeness', async () => {
      const profile = createMockProfile({ settings: createMockSettings() });
      profileRepo.findOne
        .mockResolvedValueOnce(profile) // primera búsqueda
        .mockResolvedValueOnce({ ...profile, city: 'Pasto' }); // después de actualizar
      profileRepo.save.mockResolvedValue({ ...profile, city: 'Pasto' } as UserProfile);
      activityLogRepo.create.mockReturnValue({});
      activityLogRepo.save.mockResolvedValue({});

      const result = await service.updateProfile('user-uuid-1', { city: 'Pasto' });

      expect(profileRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ profileCompleteness: expect.any(Number) }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'user.profile.updated',
        expect.objectContaining({ userId: 'user-uuid-1' }),
        'user-service',
      );
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent', { city: 'Pasto' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería registrar la actividad profile_updated', async () => {
      const profile = createMockProfile({ settings: createMockSettings() });
      profileRepo.findOne
        .mockResolvedValueOnce(profile)
        .mockResolvedValueOnce(profile);
      profileRepo.save.mockResolvedValue(profile);
      activityLogRepo.create.mockReturnValue({});
      activityLogRepo.save.mockResolvedValue({});

      await service.updateProfile('user-uuid-1', { bio: 'Nueva bio' });

      expect(activityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          activityType: ActivityType.PROFILE_UPDATED,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE SETTINGS
  // ═══════════════════════════════════════════════════════════════════
  describe('updateSettings', () => {
    it('debería actualizar la configuración', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);
      settingsRepo.save.mockResolvedValue({ ...settings, theme: UiTheme.DARK } as UserSettings);
      activityLogRepo.create.mockReturnValue({});
      activityLogRepo.save.mockResolvedValue({});

      const result = await service.updateSettings('user-uuid-1', { theme: UiTheme.DARK });

      expect(settingsRepo.save).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      settingsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateSettings('non-existent', { theme: UiTheme.DARK }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería registrar actividad settings_changed', async () => {
      const settings = createMockSettings();
      settingsRepo.findOne.mockResolvedValue(settings);
      settingsRepo.save.mockResolvedValue(settings);
      activityLogRepo.create.mockReturnValue({});
      activityLogRepo.save.mockResolvedValue({});

      await service.updateSettings('user-uuid-1', { language: UiLanguage.EN });

      expect(activityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-uuid-1',
          activityType: ActivityType.SETTINGS_CHANGED,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET ACTIVITY LOG
  // ═══════════════════════════════════════════════════════════════════
  describe('getActivityLog', () => {
    it('debería retornar actividad paginada', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(25),
        getMany: jest.fn().mockResolvedValue([{ id: '1' }, { id: '2' }]),
      };
      activityLogRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getActivityLog('user-uuid-1', { page: 1, limit: 20 });

      expect(result).toEqual({
        data: [{ id: '1' }, { id: '2' }],
        total: 25,
        page: 1,
        limit: 20,
        totalPages: 2,
      });
    });

    it('debería filtrar por activityType si se proporciona', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
        getMany: jest.fn().mockResolvedValue([]),
      };
      activityLogRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.getActivityLog('user-uuid-1', {
        activityType: ActivityType.LOGIN,
        page: 1,
        limit: 10,
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'log.activityType = :activityType',
        { activityType: ActivityType.LOGIN },
      );
    });

    it('debería filtrar por rango de fechas', async () => {
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };
      activityLogRepo.createQueryBuilder.mockReturnValue(mockQb);

      const startDate = '2025-01-01';
      const endDate = '2025-12-31';

      await service.getActivityLog('user-uuid-1', { startDate, endDate, page: 1, limit: 20 });

      expect(mockQb.andWhere).toHaveBeenCalledWith('log.createdAt >= :startDate', { startDate });
      expect(mockQb.andWhere).toHaveBeenCalledWith('log.createdAt <= :endDate', { endDate });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOG ACTIVITY
  // ═══════════════════════════════════════════════════════════════════
  describe('logActivity', () => {
    it('debería crear un registro de actividad', async () => {
      activityLogRepo.create.mockReturnValue({});
      activityLogRepo.save.mockResolvedValue({});

      await service.logActivity('user-uuid-1', ActivityType.LOGIN, 'Login exitoso', { ip: '127.0.0.1' });

      expect(activityLogRepo.create).toHaveBeenCalledWith({
        userId: 'user-uuid-1',
        activityType: ActivityType.LOGIN,
        description: 'Login exitoso',
        metadata: { ip: '127.0.0.1' },
      });
    });

    it('debería manejar description y metadata como null', async () => {
      activityLogRepo.create.mockReturnValue({});
      activityLogRepo.save.mockResolvedValue({});

      await service.logActivity('user-uuid-1', ActivityType.LOGOUT);

      expect(activityLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: null, metadata: null }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET BASIC PROFILE (inter-servicio)
  // ═══════════════════════════════════════════════════════════════════
  describe('getBasicProfile', () => {
    it('debería retornar datos básicos del perfil', async () => {
      const profile = createMockProfile();
      profileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getBasicProfile('user-uuid-1');

      expect(result).toEqual({
        userId: profile.userId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl,
        isActive: true,
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      profileRepo.findOne.mockResolvedValue(null);

      await expect(service.getBasicProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET BATCH BASIC PROFILES (inter-servicio)
  // ═══════════════════════════════════════════════════════════════════
  describe('getBatchBasicProfiles', () => {
    it('debería retornar perfiles básicos para múltiples userIds', async () => {
      const profiles = [
        createMockProfile({ userId: 'user-1', firstName: 'Juan', lastName: 'A' }),
        createMockProfile({ userId: 'user-2', firstName: 'María', lastName: 'B' }),
      ];
      profileRepo.find.mockResolvedValue(profiles);

      const result = await service.getBatchBasicProfiles(['user-1', 'user-2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 'user-1',
        firstName: 'Juan',
        lastName: 'A',
        avatarUrl: null,
      });
    });

    it('debería retornar array vacío si no se encuentran perfiles', async () => {
      profileRepo.find.mockResolvedValue([]);

      const result = await service.getBatchBasicProfiles(['non-existent-1']);

      expect(result).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CALCULATE COMPLETENESS (private, probado indirectamente)
  // ═══════════════════════════════════════════════════════════════════
  describe('calculateCompleteness (indirecto)', () => {
    it('debería calcular 0% para perfil completamente vacío', async () => {
      const emptyProfile = createMockProfile({
        firstName: '',
        lastName: '',
        phone: null,
        dateOfBirth: null,
        gender: null,
        bio: null,
        city: null,
        department: null,
        avatarUrl: null,
        websiteUrl: null,
        linkedinUrl: null,
      });
      profileRepo.findOne
        .mockResolvedValueOnce(null) // no existe
        .mockResolvedValueOnce(emptyProfile);
      profileRepo.create.mockReturnValue(emptyProfile);
      profileRepo.save.mockImplementation(async (p: any) => {
        // Capturar el completeness calculado
        emptyProfile.profileCompleteness = p.profileCompleteness;
        return p;
      });
      settingsRepo.create.mockReturnValue(createMockSettings());
      settingsRepo.save.mockResolvedValue(createMockSettings());

      await service.createProfile({ userId: 'new-user', role: 'student', firstName: '', lastName: '' });

      expect(emptyProfile.profileCompleteness).toBe(0);
    });

    it('debería calcular 100% cuando todos los 11 campos están llenos', async () => {
      const fullProfile = createMockProfile({
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+573001234567',
        dateOfBirth: new Date('1998-05-15'),
        gender: 'male',
        bio: 'Estudiante de ingeniería',
        city: 'Pasto',
        department: 'Nariño',
        avatarUrl: 'https://cdn.example.com/avatar.jpg',
        websiteUrl: 'https://juanperez.dev',
        linkedinUrl: 'https://linkedin.com/in/juanperez',
      });
      profileRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fullProfile);
      profileRepo.create.mockReturnValue(fullProfile);
      profileRepo.save.mockImplementation(async (p: any) => {
        fullProfile.profileCompleteness = p.profileCompleteness;
        return p;
      });
      settingsRepo.create.mockReturnValue(createMockSettings());
      settingsRepo.save.mockResolvedValue(createMockSettings());

      await service.createProfile({
        userId: 'full-user',
        role: 'student',
        firstName: 'Juan',
        lastName: 'Pérez',
        phone: '+573001234567',
        dateOfBirth: '1998-05-15',
        gender: 'male',
        bio: 'Estudiante de ingeniería',
        city: 'Pasto',
        department: 'Nariño',
      });

      expect(fullProfile.profileCompleteness).toBe(100);
    });
  });
});

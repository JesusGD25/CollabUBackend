import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UiTheme, UiLanguage } from './entities/user-settings.entity';

// ─── Mock UsersService ───────────────────────────────────────────────

const mockUsersService = {
  createProfile: jest.fn(),
  getProfile: jest.fn(),
  getProfileById: jest.fn(),
  updateProfile: jest.fn(),
  updateSettings: jest.fn(),
  getActivityLog: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: typeof mockUsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = mockUsersService;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /profile
  // ═══════════════════════════════════════════════════════════════════
  describe('createProfile', () => {
    it('debería forzar userId del token JWT y crear perfil', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const dto = { userId: 'ignored', role: 'student', firstName: 'Juan', lastName: 'Pérez' };
      const expected = { id: 'profile-1', userId: 'user-uuid-1', firstName: 'Juan' };
      service.createProfile.mockResolvedValue(expected);

      const result = await controller.createProfile(req, dto);

      // El controller fuerza dto.userId = req.user.id
      expect(dto.userId).toBe('user-uuid-1');
      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /profile
  // ═══════════════════════════════════════════════════════════════════
  describe('getMyProfile', () => {
    it('debería retornar el perfil del usuario autenticado', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const profile = { userId: 'user-uuid-1', firstName: 'Juan', settings: {} };
      service.getProfile.mockResolvedValue(profile);

      const result = await controller.getMyProfile(req);

      expect(result).toEqual(profile);
      expect(service.getProfile).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /profile/:userId
  // ═══════════════════════════════════════════════════════════════════
  describe('getProfileById', () => {
    it('debería retornar el perfil de otro usuario por userId', async () => {
      const profile = { userId: 'other-user', firstName: 'María' };
      service.getProfileById.mockResolvedValue(profile);

      const result = await controller.getProfileById('other-user');

      expect(result).toEqual(profile);
      expect(service.getProfileById).toHaveBeenCalledWith('other-user');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /profile
  // ═══════════════════════════════════════════════════════════════════
  describe('updateProfile', () => {
    it('debería actualizar el perfil del usuario autenticado', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const dto = { city: 'Pasto', bio: 'Nueva bio' };
      const updated = { userId: 'user-uuid-1', city: 'Pasto', bio: 'Nueva bio', profileCompleteness: 36 };
      service.updateProfile.mockResolvedValue(updated);

      const result = await controller.updateProfile(req, dto);

      expect(result).toEqual(updated);
      expect(service.updateProfile).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /settings
  // ═══════════════════════════════════════════════════════════════════
  describe('getSettings', () => {
    it('debería retornar los settings del perfil', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const settings = { theme: UiTheme.SYSTEM, language: UiLanguage.ES };
      service.getProfile.mockResolvedValue({ settings });

      const result = await controller.getSettings(req);

      expect(result).toEqual(settings);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PATCH /settings
  // ═══════════════════════════════════════════════════════════════════
  describe('updateSettings', () => {
    it('debería actualizar los settings del usuario', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const dto = { theme: UiTheme.DARK, language: UiLanguage.EN };
      const updated = { ...dto, userId: 'user-uuid-1' };
      service.updateSettings.mockResolvedValue(updated);

      const result = await controller.updateSettings(req, dto as any);

      expect(result).toEqual(updated);
      expect(service.updateSettings).toHaveBeenCalledWith('user-uuid-1', dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET /activity
  // ═══════════════════════════════════════════════════════════════════
  describe('getActivityLog', () => {
    it('debería retornar actividad paginada', async () => {
      const req = { user: { id: 'user-uuid-1' } };
      const query = { page: 1, limit: 20 };
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      service.getActivityLog.mockResolvedValue(expected);

      const result = await controller.getActivityLog(req, query as any);

      expect(result).toEqual(expected);
      expect(service.getActivityLog).toHaveBeenCalledWith('user-uuid-1', query);
    });
  });
});

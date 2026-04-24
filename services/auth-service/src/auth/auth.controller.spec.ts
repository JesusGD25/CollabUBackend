import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole } from './entities/user.entity';

// ─── Mock AuthService ────────────────────────────────────────────────

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  logoutAll: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerificationEmail: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  validateToken: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;
  let service: typeof mockAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = mockAuthService;
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /register
  // ═══════════════════════════════════════════════════════════════════
  describe('register', () => {
    it('debería delegar la creación del usuario al servicio', async () => {
      const dto = { email: 'nuevo@udenar.edu.co', password: 'Password1!', role: UserRole.STUDENT };
      const expected = { message: 'ok', userId: 'uuid-1' };
      service.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(result).toEqual(expected);
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /login
  // ═══════════════════════════════════════════════════════════════════
  describe('login', () => {
    it('debería retornar accessToken, refreshToken y datos del usuario', async () => {
      const dto = { email: 'test@udenar.edu.co', password: 'Password1!' };
      const expected = {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-uuid',
        user: { id: 'uuid-1', email: dto.email, role: UserRole.STUDENT, isVerified: true, isActive: true },
        expiresIn: 3600,
      };
      service.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(result).toEqual(expected);
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /refresh
  // ═══════════════════════════════════════════════════════════════════
  describe('refresh', () => {
    it('debería renovar los tokens', async () => {
      const dto = { refreshToken: 'old-refresh-token' };
      const expected = { accessToken: 'new-jwt', refreshToken: 'new-refresh', expiresIn: 3600 };
      service.refreshToken.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /logout
  // ═══════════════════════════════════════════════════════════════════
  describe('logout', () => {
    it('debería cerrar sesión del usuario autenticado', async () => {
      const req = { user: { id: 'uuid-1' } };
      const body = { refreshToken: 'some-refresh' };
      service.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req, body);

      expect(result.message).toBe('Sesión cerrada exitosamente');
      expect(service.logout).toHaveBeenCalledWith('uuid-1', 'some-refresh');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /logout-all
  // ═══════════════════════════════════════════════════════════════════
  describe('logoutAll', () => {
    it('debería cerrar todas las sesiones', async () => {
      const req = { user: { id: 'uuid-1' } };
      service.logoutAll.mockResolvedValue(undefined);

      const result = await controller.logoutAll(req);

      expect(result.message).toBe('Todas las sesiones cerradas exitosamente');
      expect(service.logoutAll).toHaveBeenCalledWith('uuid-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /verify-email
  // ═══════════════════════════════════════════════════════════════════
  describe('verifyEmail', () => {
    it('debería verificar el email con el token', async () => {
      const dto = { token: 'verify-token-uuid' };
      const expected = { message: 'Email verificado exitosamente' };
      service.verifyEmail.mockResolvedValue(expected);

      const result = await controller.verifyEmail(dto);

      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /resend-verification-email
  // ═══════════════════════════════════════════════════════════════════
  describe('resendVerificationEmail', () => {
    it('debería procesar la solicitud de reenvío', async () => {
      const dto = { email: 'test@udenar.edu.co' };
      const expected = {
        message: 'Si el email está registrado y pendiente de verificación, recibirás un nuevo enlace',
      };
      service.resendVerificationEmail.mockResolvedValue(expected);

      const result = await controller.resendVerificationEmail(dto);

      expect(result).toEqual(expected);
      expect(service.resendVerificationEmail).toHaveBeenCalledWith(dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /forgot-password
  // ═══════════════════════════════════════════════════════════════════
  describe('forgotPassword', () => {
    it('debería procesar la solicitud de restablecimiento', async () => {
      const dto = { email: 'test@udenar.edu.co' };
      const expected = { message: 'Si el email está registrado...' };
      service.forgotPassword.mockResolvedValue(expected);

      const result = await controller.forgotPassword(dto);

      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /reset-password
  // ═══════════════════════════════════════════════════════════════════
  describe('resetPassword', () => {
    it('debería restablecer la contraseña', async () => {
      const dto = { token: 'reset-token', newPassword: 'New1Password!' };
      const expected = { message: 'Contraseña restablecida exitosamente' };
      service.resetPassword.mockResolvedValue(expected);

      const result = await controller.resetPassword(dto);

      expect(result).toEqual(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /change-password
  // ═══════════════════════════════════════════════════════════════════
  describe('changePassword', () => {
    it('debería cambiar la contraseña del usuario autenticado', async () => {
      const req = { user: { id: 'uuid-1' } };
      const dto = { currentPassword: 'Current1!', newPassword: 'New1Password!' };
      const expected = { message: 'Contraseña cambiada exitosamente' };
      service.changePassword.mockResolvedValue(expected);

      const result = await controller.changePassword(req, dto);

      expect(result).toEqual(expected);
      expect(service.changePassword).toHaveBeenCalledWith('uuid-1', dto);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // POST /validate
  // ═══════════════════════════════════════════════════════════════════
  describe('validateToken', () => {
    it('debería validar el token JWT', async () => {
      const body = { token: 'jwt-token' };
      const expected = { valid: true, id: 'uuid-1', email: 'x@x.com', role: 'student' };
      service.validateToken.mockResolvedValue(expected);

      const result = await controller.validateToken(body);

      expect(result).toEqual(expected);
    });
  });
});

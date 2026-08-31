import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { EventPublisher } from '@collab-u/shared';

import { AuthService } from './auth.service';
import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationToken, VerificationTokenType } from './entities/verification-token.entity';

// ─── Mocks ──────────────────────────────────────────────────────────

const mockEventPublisher = {
  publish: jest.fn().mockResolvedValue(undefined),
};

const mockUserRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockRefreshTokenRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockVerificationTokenRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn(),
});

// ─── Helper ─────────────────────────────────────────────────────────

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-1',
    email: 'test@udenar.edu.co',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.STUDENT,
    isVerified: true,
    isActive: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshTokens: [],
    verificationTokens: [],
    ...overrides,
  } as User;
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let refreshTokenRepo: jest.Mocked<Repository<RefreshToken>>;
  let verificationTokenRepo: jest.Mocked<Repository<VerificationToken>>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useFactory: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useFactory: mockRefreshTokenRepo },
        { provide: getRepositoryToken(VerificationToken), useFactory: mockVerificationTokenRepo },
        { provide: JwtService, useFactory: mockJwtService },
        { provide: EventPublisher, useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
    verificationTokenRepo = module.get(getRepositoryToken(VerificationToken));
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ═══════════════════════════════════════════════════════════════════
  // REGISTER
  // ═══════════════════════════════════════════════════════════════════
  describe('register', () => {
    const dto = { email: 'nuevo@udenar.edu.co', password: 'Password1!', role: UserRole.STUDENT };

    it('debería registrar un nuevo usuario exitosamente', async () => {
      userRepo.findOne.mockResolvedValue(null); // email no existe
      userRepo.create.mockReturnValue({ id: 'new-id', email: dto.email, role: dto.role } as User);
      userRepo.save.mockResolvedValue({ id: 'new-id', email: dto.email, role: dto.role } as User);
      verificationTokenRepo.create.mockReturnValue({} as VerificationToken);
      verificationTokenRepo.save.mockResolvedValue({} as VerificationToken);

      const result = await service.register(dto);

      expect(result).toHaveProperty('userId', 'new-id');
      expect(result).toHaveProperty('message');
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: dto.email, role: dto.role }),
      );
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.created',
        expect.objectContaining({ userId: 'new-id', email: dto.email, role: dto.role }),
        'auth-service',
      );
    });

    it('debería lanzar ConflictException si el email ya existe', async () => {
      userRepo.findOne.mockResolvedValue(createMockUser());

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('debería generar un token de verificación de email', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({ id: 'new-id' } as User);
      userRepo.save.mockResolvedValue({ id: 'new-id', email: dto.email, role: dto.role } as User);
      verificationTokenRepo.create.mockReturnValue({} as VerificationToken);
      verificationTokenRepo.save.mockResolvedValue({} as VerificationToken);

      await service.register(dto);

      expect(verificationTokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'new-id',
          type: VerificationTokenType.EMAIL_VERIFICATION,
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════
  describe('login', () => {
    const dto = { email: 'test@udenar.edu.co', password: 'Password1!' };

    it('debería iniciar sesión exitosamente con credenciales válidas', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 12);
      const user = createMockUser({ passwordHash: hashedPw });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);
      refreshTokenRepo.create.mockReturnValue({} as RefreshToken);
      refreshTokenRepo.save.mockResolvedValue({} as RefreshToken);

      const result = await service.login(dto);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 3600);
      expect(result.user).toEqual(
        expect.objectContaining({ id: user.id, email: user.email, role: user.role }),
      );
    });

    it('debería lanzar UnauthorizedException si el usuario no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      const user = createMockUser({ passwordHash: await bcrypt.hash('OtraPassword1!', 12) });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(userRepo.save).toHaveBeenCalled(); // incrementa failedLoginAttempts
    });

    it('debería bloquear la cuenta después de 5 intentos fallidos', async () => {
      const user = createMockUser({
        passwordHash: await bcrypt.hash('OtraPassword1!', 12),
        failedLoginAttempts: 4,
      });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);

      // Verifica que se estableció lockedUntil
      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 5,
          lockedUntil: expect.any(Date),
        }),
      );
    });

    it('debería rechazar login si la cuenta está bloqueada', async () => {
      const user = createMockUser({
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 min en el futuro
      });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('debería rechazar login si la cuenta está desactivada', async () => {
      const user = createMockUser({ isActive: false });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('debería rechazar login si el email no está verificado', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 12);
      const user = createMockUser({
        isVerified: false,
        passwordHash: hashedPw,
      });
      userRepo.findOne.mockResolvedValue(user);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(dto)).rejects.toThrow(
        'Debes verificar tu correo antes de iniciar sesión',
      );
    });

    it('debería resetear intentos fallidos tras login exitoso', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 12);
      const user = createMockUser({
        passwordHash: hashedPw,
        failedLoginAttempts: 3,
      });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue(user);
      refreshTokenRepo.create.mockReturnValue({} as RefreshToken);
      refreshTokenRepo.save.mockResolvedValue({} as RefreshToken);

      await service.login(dto);

      expect(userRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLogin: expect.any(Date),
        }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATE USER (para LocalStrategy)
  // ═══════════════════════════════════════════════════════════════════
  describe('validateUser', () => {
    it('debería retornar el usuario si las credenciales son válidas', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 12);
      const user = createMockUser({ passwordHash: hashedPw });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@udenar.edu.co', 'Password1!');

      expect(result).toEqual(user);
    });

    it('debería retornar null si el usuario no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.validateUser('noexiste@udenar.edu.co', 'Password1!');

      expect(result).toBeNull();
    });

    it('debería retornar null si la contraseña es incorrecta', async () => {
      const user = createMockUser({ passwordHash: await bcrypt.hash('OtraPassword1!', 12) });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.validateUser('test@udenar.edu.co', 'Password1!');

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // REFRESH TOKEN
  // ═══════════════════════════════════════════════════════════════════
  describe('refreshToken', () => {
    const dto = { refreshToken: 'valid-refresh-token' };

    it('debería renovar tokens exitosamente (rotación)', async () => {
      const existingToken = {
        id: 'rt-1',
        userId: 'user-uuid-1',
        token: 'valid-refresh-token',
        revoked: false,
        revokedAt: null,
        replacedByToken: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as RefreshToken;

      const user = createMockUser();

      refreshTokenRepo.findOne.mockResolvedValue(existingToken);
      userRepo.findOne.mockResolvedValue(user);
      refreshTokenRepo.save.mockResolvedValue(existingToken);
      refreshTokenRepo.create.mockReturnValue({} as RefreshToken);

      const result = await service.refreshToken(dto);

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 3600);
      // El token anterior debería haber sido revocado
      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true, revokedAt: expect.any(Date) }),
      );
    });

    it('debería lanzar UnauthorizedException si el refresh token no existe', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el usuario está desactivado', async () => {
      const existingToken = {
        id: 'rt-1',
        userId: 'user-uuid-1',
        token: 'valid-refresh-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      } as RefreshToken;

      refreshTokenRepo.findOne.mockResolvedValue(existingToken);
      userRepo.findOne.mockResolvedValue(null); // usuario no encontrado

      await expect(service.refreshToken(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════
  describe('logout', () => {
    it('debería revocar el refresh token del usuario', async () => {
      const token = { id: 'rt-1', revoked: false, revokedAt: null } as RefreshToken;
      refreshTokenRepo.findOne.mockResolvedValue(token);
      refreshTokenRepo.save.mockResolvedValue(token);

      await service.logout('user-uuid-1', 'some-refresh-token');

      expect(refreshTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ revoked: true, revokedAt: expect.any(Date) }),
      );
    });

    it('no debería fallar si el token no existe', async () => {
      refreshTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.logout('user-uuid-1', 'non-existent')).resolves.toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // LOGOUT ALL
  // ═══════════════════════════════════════════════════════════════════
  describe('logoutAll', () => {
    it('debería revocar todos los refresh tokens del usuario', async () => {
      refreshTokenRepo.update.mockResolvedValue({ affected: 3 } as any);

      await service.logoutAll('user-uuid-1');

      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', revoked: false },
        { revoked: true, revokedAt: expect.any(Date) },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // VERIFY EMAIL
  // ═══════════════════════════════════════════════════════════════════
  describe('verifyEmail', () => {
    it('debería verificar el email exitosamente', async () => {
      const vToken = {
        userId: 'user-uuid-1',
        token: 'valid-verification-token',
        type: VerificationTokenType.EMAIL_VERIFICATION,
        used: false,
        usedAt: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      } as VerificationToken;

      verificationTokenRepo.findOne.mockResolvedValue(vToken);
      verificationTokenRepo.save.mockResolvedValue(vToken);
      userRepo.findOne.mockResolvedValue(createMockUser({ id: 'user-uuid-1' }));
      userRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.verifyEmail({ token: 'valid-verification-token' });

      expect(result.message).toBe('Email verificado exitosamente');
      expect(verificationTokenRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ used: true, usedAt: expect.any(Date) }),
      );
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-1', { isVerified: true });
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'auth.user.verified',
        {
          userId: 'user-uuid-1',
          email: 'test@udenar.edu.co',
          role: UserRole.STUDENT,
        },
        'auth-service',
      );
    });

    it('debería lanzar BadRequestException si el token es inválido', async () => {
      verificationTokenRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'invalid-token' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ═══════════════════════════════════════════════════════════════════
  describe('forgotPassword', () => {
    it('debería generar un token de reset si el email existe', async () => {
      const user = createMockUser();
      userRepo.findOne.mockResolvedValue(user);
      verificationTokenRepo.create.mockReturnValue({} as VerificationToken);
      verificationTokenRepo.save.mockResolvedValue({ token: 'reset-uuid' } as VerificationToken);

      const result = await service.forgotPassword({ email: 'test@udenar.edu.co' });

      expect(result).toHaveProperty('message');
      expect(verificationTokenRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          type: VerificationTokenType.PASSWORD_RESET,
        }),
      );
    });

    it('debería retornar el mismo mensaje si el email no existe (prevenir enumeración)', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'noexiste@udenar.edu.co' });

      expect(result).toHaveProperty('message');
      expect(verificationTokenRepo.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // RESET PASSWORD
  // ═══════════════════════════════════════════════════════════════════
  describe('resetPassword', () => {
    it('debería restablecer la contraseña exitosamente', async () => {
      const resetToken = {
        userId: 'user-uuid-1',
        token: 'valid-reset-token',
        type: VerificationTokenType.PASSWORD_RESET,
        used: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      } as VerificationToken;

      verificationTokenRepo.findOne.mockResolvedValue(resetToken);
      verificationTokenRepo.save.mockResolvedValue(resetToken);
      userRepo.update.mockResolvedValue({ affected: 1 } as any);
      refreshTokenRepo.update.mockResolvedValue({ affected: 2 } as any);

      const result = await service.resetPassword({
        token: 'valid-reset-token',
        newPassword: 'NewPassword1!',
      });

      expect(result.message).toBe('Contraseña restablecida exitosamente');
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ passwordHash: expect.any(String), passwordChangedAt: expect.any(Date) }),
      );
      // Debería revocar todos los refresh tokens
      expect(refreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', revoked: false },
        { revoked: true, revokedAt: expect.any(Date) },
      );
    });

    it('debería lanzar BadRequestException si el token es inválido', async () => {
      verificationTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'invalid', newPassword: 'NewPassword1!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // CHANGE PASSWORD
  // ═══════════════════════════════════════════════════════════════════
  describe('changePassword', () => {
    it('debería cambiar la contraseña exitosamente', async () => {
      const hashedPw = await bcrypt.hash('CurrentPassword1!', 12);
      const user = createMockUser({ passwordHash: hashedPw });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.update.mockResolvedValue({ affected: 1 } as any);
      refreshTokenRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.changePassword('user-uuid-1', {
        currentPassword: 'CurrentPassword1!',
        newPassword: 'NewPassword1!',
      });

      expect(result.message).toBe('Contraseña cambiada exitosamente');
      expect(userRepo.update).toHaveBeenCalledWith(
        'user-uuid-1',
        expect.objectContaining({ passwordHash: expect.any(String) }),
      );
    });

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('non-existent', {
          currentPassword: 'X',
          newPassword: 'Y',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar UnauthorizedException si la contraseña actual es incorrecta', async () => {
      const user = createMockUser({ passwordHash: await bcrypt.hash('Correcta1!', 12) });
      userRepo.findOne.mockResolvedValue(user);

      await expect(
        service.changePassword('user-uuid-1', {
          currentPassword: 'Incorrecta1!',
          newPassword: 'Nueva1!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // VALIDATE TOKEN
  // ═══════════════════════════════════════════════════════════════════
  describe('validateToken', () => {
    it('debería validar un token JWT correctamente', async () => {
      const user = createMockUser();
      jwtService.verify.mockReturnValue({ sub: user.id, email: user.email, role: user.role });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.validateToken('valid-jwt');

      expect(result).toEqual({
        valid: true,
        id: user.id,
        email: user.email,
        role: user.role,
      });
    });

    it('debería lanzar UnauthorizedException si el token es inválido', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      await expect(service.validateToken('invalid-jwt')).rejects.toThrow(UnauthorizedException);
    });

    it('debería lanzar UnauthorizedException si el usuario está desactivado', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', email: 'x', role: 'student' });
      userRepo.findOne.mockResolvedValue(null); // not found or inactive

      await expect(service.validateToken('valid-jwt-inactive')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET USER BY ID (interno)
  // ═══════════════════════════════════════════════════════════════════
  describe('getUserById', () => {
    it('debería retornar los datos básicos del usuario', async () => {
      const user = createMockUser();
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.getUserById('user-uuid-1');

      expect(result).toEqual({
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // GET USER ROLE (interno)
  // ═══════════════════════════════════════════════════════════════════
  describe('getUserRole', () => {
    it('debería retornar el rol del usuario', async () => {
      const user = createMockUser({ role: UserRole.COMPANY });
      userRepo.findOne.mockResolvedValue(user);

      const result = await service.getUserRole('user-uuid-1');

      expect(result).toEqual({ role: UserRole.COMPANY });
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.getUserRole('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});

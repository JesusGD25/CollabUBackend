import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { EventPublisher } from '@collab-u/shared';

import { User, UserRole } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationToken, VerificationTokenType } from './entities/verification-token.entity';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationEmailDto } from './dto/resend-verification-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_DAYS = 7;
const VERIFICATION_TOKEN_HOURS = 24;
const RESET_TOKEN_HOURS = 1;
const RESEND_VERIFICATION_COOLDOWN_SECONDS = 60;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(VerificationToken)
    private readonly verificationTokenRepo: Repository<VerificationToken>,
    private readonly jwtService: JwtService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ─── REGISTER (público — solo student/company) ────────────────────────
  // Las cuentas admin/faculty NUNCA se crean por auto-registro público — solo
  // desde el panel de administración vía POST /api/v1/auth/admin/users
  // (createAdminUser), guardado por @Roles(ADMIN). Ver auth.controller.ts.
  async register(dto: RegisterDto): Promise<{ message: string; userId: string }> {
    if (dto.role !== UserRole.STUDENT && dto.role !== UserRole.COMPANY) {
      throw new BadRequestException(
        'El auto-registro solo está disponible para estudiantes y empresas. Las cuentas de administrador y docente son creadas por la Facultad.',
      );
    }

    // 1. Verificar que email no exista
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    // 3. Crear usuario
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
    const savedUser = await this.userRepo.save(user);

    // 4. Generar verification token
    const verificationToken = this.verificationTokenRepo.create({
      userId: savedUser.id,
      token: uuidv4(),
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 60 * 60 * 1000),
    });
    await this.verificationTokenRepo.save(verificationToken);

    // 5. Publicar evento auth.user.created
    await this.eventPublisher.publish(
      'auth.user.created',
      { userId: savedUser.id, email: savedUser.email, role: savedUser.role },
      'auth-service',
    );

    // 6. Publicar evento para que notification-service envíe el correo de
    // verificación — separado de auth.user.created porque ese evento ya tiene
    // otros consumidores (perfil, etc.) y no debería acoplarse al envío de email.
    await this.eventPublisher.publish(
      'auth.email_verification.requested',
      {
        userId: savedUser.id,
        email: savedUser.email,
        verifyUrl: `${FRONTEND_URL}/auth/verify-email?token=${verificationToken.token}`,
      },
      'auth-service',
    );

    this.logger.log(`Usuario registrado: ${savedUser.email} [${savedUser.id}]`);

    // 6. Retornar — incluimos el token de verificación para testing
    return {
      message: 'Usuario registrado exitosamente. Revisa tu email para verificar la cuenta.',
      userId: savedUser.id,
    };
  }

  // ─── LOGIN ──────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; role: UserRole; isVerified: boolean; isActive: boolean };
    expiresIn: number;
  }> {
    // 1. Buscar usuario
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Verificar que no esté bloqueado
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intenta de nuevo en ${minutesLeft} minutos`,
      );
    }

    // 3. Verificar que esté activo
    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Debes verificar tu correo antes de iniciar sesión');
    }

    // 4. Comparar password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Incrementar intentos fallidos
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
        this.logger.warn(`Cuenta bloqueada por intentos fallidos: ${user.email}`);
      }
      await this.userRepo.save(user);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 5. Resetear intentos fallidos, actualizar lastLogin
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLogin = new Date();
    await this.userRepo.save(user);

    // 6. Generar access token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // 7. Generar refresh token
    const refreshTokenValue = uuidv4();
    const refreshToken = this.refreshTokenRepo.create({
      userId: user.id,
      token: refreshTokenValue,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepo.save(refreshToken);

    this.logger.log(`Login exitoso: ${user.email}`);

    // 8. Retornar
    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
      expiresIn: 3600, // 1 hora en segundos
    };
  }

  // ─── VALIDATE USER (para LocalStrategy) ─────────────────────────────
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { email, isActive: true } });
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  // ─── REFRESH TOKEN ──────────────────────────────────────────────────
  async refreshToken(dto: RefreshTokenDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    // 1. Buscar refresh token (no revocado, no expirado)
    const existingToken = await this.refreshTokenRepo.findOne({
      where: {
        token: dto.refreshToken,
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!existingToken) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Obtener usuario
    const user = await this.userRepo.findOne({ where: { id: existingToken.userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado o desactivado');
    }

    // 2. Revocar el token actual (rotación)
    const newRefreshTokenValue = uuidv4();
    existingToken.revoked = true;
    existingToken.revokedAt = new Date();
    existingToken.replacedByToken = newRefreshTokenValue;
    await this.refreshTokenRepo.save(existingToken);

    // 3. Generar nuevo access + refresh token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const newRefreshToken = this.refreshTokenRepo.create({
      userId: user.id,
      token: newRefreshTokenValue,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepo.save(newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshTokenValue,
      expiresIn: 3600,
    };
  }

  // ─── LOGOUT ─────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken: string): Promise<void> {
    const token = await this.refreshTokenRepo.findOne({
      where: { userId, token: refreshToken, revoked: false },
    });

    if (token) {
      token.revoked = true;
      token.revokedAt = new Date();
      await this.refreshTokenRepo.save(token);
    }

    this.logger.log(`Logout: usuario ${userId}`);
  }

  // ─── LOGOUT ALL ─────────────────────────────────────────────────────
  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
    this.logger.log(`Logout all: usuario ${userId}`);
  }

  // ─── VERIFY EMAIL ──────────────────────────────────────────────────
  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    // 1. Buscar verification token
    const verificationToken = await this.verificationTokenRepo.findOne({
      where: {
        token: dto.token,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!verificationToken) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    const user = await this.userRepo.findOne({ where: { id: verificationToken.userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 2. Marcar token como usado
    verificationToken.used = true;
    verificationToken.usedAt = new Date();
    await this.verificationTokenRepo.save(verificationToken);

    // 3. Actualizar user.isVerified
    await this.userRepo.update(user.id, { isVerified: true });

    // 4. Publicar evento
    await this.eventPublisher.publish(
      'auth.user.verified',
      { userId: user.id, email: user.email, role: user.role },
      'auth-service',
    );

    this.logger.log(`Email verificado: usuario ${user.id}`);

    return { message: 'Email verificado exitosamente' };
  }

  // ─── RESEND VERIFICATION EMAIL ───────────────────────────────────
  async resendVerificationEmail(dto: ResendVerificationEmailDto): Promise<{ message: string }> {
    const genericMessage =
      'Si el email está registrado y pendiente de verificación, recibirás un nuevo enlace';

    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // No revelar si el usuario existe
    if (!user || user.isVerified || !user.isActive) {
      return { message: genericMessage };
    }

    const latestToken = await this.verificationTokenRepo.findOne({
      where: {
        userId: user.id,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        used: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (latestToken) {
      const secondsSinceLastToken = Math.floor((Date.now() - latestToken.createdAt.getTime()) / 1000);
      if (secondsSinceLastToken < RESEND_VERIFICATION_COOLDOWN_SECONDS) {
        this.logger.warn(
          `Reenvío de verificación en cooldown para usuario ${user.id}: ${secondsSinceLastToken}s`,
        );
        return { message: genericMessage };
      }
    }

    await this.verificationTokenRepo.update(
      {
        userId: user.id,
        type: VerificationTokenType.EMAIL_VERIFICATION,
        used: false,
      },
      {
        used: true,
        usedAt: new Date(),
      },
    );

    const verificationToken = this.verificationTokenRepo.create({
      userId: user.id,
      token: uuidv4(),
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 60 * 60 * 1000),
    });
    await this.verificationTokenRepo.save(verificationToken);

    await this.eventPublisher.publish(
      'auth.email_verification.requested',
      {
        userId: user.id,
        email: user.email,
        verifyUrl: `${FRONTEND_URL}/auth/verify-email?token=${verificationToken.token}`,
      },
      'auth-service',
    );

    this.logger.log(`Nuevo token de verificación generado para usuario ${user.id}`);

    return { message: genericMessage };
  }

  // ─── FORGOT PASSWORD ───────────────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Siempre retornamos el mismo mensaje (prevenir enumeración de emails)
    const successMessage = 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña';

    if (!user) {
      return { message: successMessage };
    }

    // Generar token de reset
    const resetToken = this.verificationTokenRepo.create({
      userId: user.id,
      token: uuidv4(),
      type: VerificationTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + RESET_TOKEN_HOURS * 60 * 60 * 1000),
    });
    await this.verificationTokenRepo.save(resetToken);

    await this.eventPublisher.publish(
      'auth.password_reset.requested',
      {
        userId: user.id,
        email: user.email,
        resetUrl: `${FRONTEND_URL}/auth/reset-password?token=${resetToken.token}`,
      },
      'auth-service',
    );

    this.logger.log(`Token de reset generado para: ${user.email}`);

    return { message: successMessage };
  }

  // ─── RESET PASSWORD ────────────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // 1. Buscar token
    const resetToken = await this.verificationTokenRepo.findOne({
      where: {
        token: dto.token,
        type: VerificationTokenType.PASSWORD_RESET,
        used: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Token de restablecimiento inválido o expirado');
    }

    // 2. Hash nueva password
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    // 3. Actualizar password
    await this.userRepo.update(resetToken.userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });

    // 4. Marcar token como usado
    resetToken.used = true;
    resetToken.usedAt = new Date();
    await this.verificationTokenRepo.save(resetToken);

    // 5. Revocar todos los refresh tokens
    await this.refreshTokenRepo.update(
      { userId: resetToken.userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    this.logger.log(`Contraseña restablecida: usuario ${resetToken.userId}`);

    return { message: 'Contraseña restablecida exitosamente' };
  }

  // ─── CHANGE PASSWORD ───────────────────────────────────────────────
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // 1. Verificar password actual
    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    // 2. Hash nueva password
    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);

    // 3. Actualizar
    await this.userRepo.update(userId, {
      passwordHash,
      passwordChangedAt: new Date(),
    });

    // 4. Revocar todos los refresh tokens
    await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    this.logger.log(`Contraseña cambiada: usuario ${userId}`);

    return { message: 'Contraseña cambiada exitosamente' };
  }

  // ─── VALIDATE TOKEN (para API Gateway) ─────────────────────────────
  async validateToken(token: string): Promise<{
    valid: boolean;
    id: string;
    email: string;
    role: string;
  }> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado o desactivado');
      }

      return {
        valid: true,
        id: user.id,
        email: user.email,
        role: user.role,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  // ─── GET USER BY ID (interno) ──────────────────────────────────────
  async getUserById(id: string): Promise<{
    id: string;
    email: string;
    role: UserRole;
    isVerified: boolean;
    isActive: boolean;
  }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
    };
  }

  // ─── GET USERS BY ROLE (interno) ────────────────────────────────────
  async getUsersByRole(role: UserRole): Promise<{ id: string; email: string }[]> {
    const users = await this.userRepo.find({
      where: { role, isActive: true },
      select: ['id', 'email'],
    });
    return users.map((u) => ({ id: u.id, email: u.email }));
  }

  // ─── GET USER ROLE (interno) ───────────────────────────────────────
  async getUserRole(id: string): Promise<{ role: UserRole }> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { role: user.role };
  }

  // ─── CREATE USER (admin) ──────────────────────────────────────────
  async createAdminUser(data: {
    email: string;
    password: string;
    role: string;
  }): Promise<Partial<User>> {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('El email ya está registrado');

    if (!Object.values(UserRole).includes(data.role as UserRole)) {
      throw new BadRequestException('Rol inválido');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      email: data.email,
      passwordHash,
      role: data.role as UserRole,
      isVerified: true,   // creado por admin, no requiere verificación por email
      isActive: true,
    });
    const saved = await this.userRepo.save(user);
    this.logger.log(`Usuario ${saved.id} (${saved.email}) creado por admin`);

    return {
      id: saved.id,
      email: saved.email,
      role: saved.role,
      isActive: saved.isActive,
      isVerified: saved.isVerified,
      lastLogin: saved.lastLogin,
      createdAt: saved.createdAt,
    };
  }

  // ─── UPDATE USER (admin) ──────────────────────────────────────────
  async updateAdminUser(
    id: string,
    data: { isActive?: boolean; role?: string; email?: string; password?: string },
  ): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updateData: Partial<User> = {};
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.role && Object.values(UserRole).includes(data.role as UserRole)) {
      updateData.role = data.role as UserRole;
    }
    if (data.email && data.email !== user.email) {
      const taken = await this.userRepo.findOne({ where: { email: data.email } });
      if (taken) throw new ConflictException('El email ya está en uso');
      updateData.email = data.email;
      // Al cambiar email, se revoca sesión activa por seguridad
      await this.refreshTokenRepo.update({ userId: id, revoked: false }, { revoked: true, revokedAt: new Date() });
    }
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
      await this.refreshTokenRepo.update({ userId: id, revoked: false }, { revoked: true, revokedAt: new Date() });
    }

    await this.userRepo.update(id, updateData);

    const updated = await this.userRepo
      .createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.role', 'user.isActive', 'user.isVerified', 'user.lastLogin', 'user.createdAt'])
      .where('user.id = :id', { id })
      .getOne();

    this.logger.log(`Usuario ${id} actualizado por admin`);
    return updated!;
  }

  // ─── DELETE USER (admin) ──────────────────────────────────────────
  async deleteAdminUser(id: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    // Revocar tokens antes de eliminar (cascade debería hacerlo, pero por seguridad)
    await this.refreshTokenRepo.update({ userId: id, revoked: false }, { revoked: true, revokedAt: new Date() });
    await this.userRepo.delete(id);
    this.logger.log(`Usuario ${id} (${user.email}) eliminado por admin`);
  }

  // ─── LIST ALL USERS (admin) ────────────────────────────────────────
  async getAdminUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: string;
  }): Promise<{
    data: Partial<User>[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.role',
        'user.isActive',
        'user.isVerified',
        'user.lastLogin',
        'user.createdAt',
      ])
      .orderBy('user.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere('user.email ILIKE :search', { search: `%${query.search}%` });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined && query.isActive !== '') {
      qb.andWhere('user.isActive = :isActive', { isActive: query.isActive === 'true' });
    }

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}

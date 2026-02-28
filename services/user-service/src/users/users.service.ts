import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';

import { UserProfile } from './entities/user-profile.entity';
import { UserSettings } from './entities/user-settings.entity';
import { ActivityLog, ActivityType } from './entities/activity-log.entity';

import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepo: Repository<UserProfile>,
    @InjectRepository(UserSettings)
    private readonly settingsRepo: Repository<UserSettings>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepo: Repository<ActivityLog>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  // ─── CREATE PROFILE ─────────────────────────────────────────────────
  async createProfile(dto: CreateUserProfileDto): Promise<UserProfile> {
    // 1. Verificar que no exista perfil para ese userId
    const existing = await this.profileRepo.findOne({ where: { userId: dto.userId } });
    if (existing) {
      throw new ConflictException('Ya existe un perfil para este usuario');
    }

    // 2. Crear perfil
    const profile = this.profileRepo.create({
      userId: dto.userId,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone || null,
      phoneCountryCode: dto.phoneCountryCode || null,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
      gender: dto.gender || null,
      bio: dto.bio || null,
      city: dto.city || null,
      department: dto.department || null,
      country: dto.country || 'Colombia',
    });

    // 4. Calcular profile completeness
    profile.profileCompleteness = this.calculateCompleteness(profile);

    const savedProfile = await this.profileRepo.save(profile);

    // 3. Crear settings por defecto
    const settings = this.settingsRepo.create({
      userId: dto.userId,
    });
    await this.settingsRepo.save(settings);

    this.logger.log(`Perfil creado para usuario: ${dto.userId}`);

    // Retornar con settings
    const result = await this.profileRepo.findOne({
      where: { userId: dto.userId },
      relations: ['settings'],
    });
    return result!;
  }

  // ─── GET PROFILE (mi perfil) ───────────────────────────────────────
  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['settings'],
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    // Actualizar lastActiveAt
    await this.profileRepo.update(profile.id, { lastActiveAt: new Date() });

    return profile;
  }

  // ─── GET PROFILE BY ID (ver perfil de otro) ────────────────────────
  async getProfileById(profileUserId: string): Promise<UserProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId: profileUserId },
      relations: ['settings'],
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return profile;
  }

  // ─── UPDATE PROFILE ────────────────────────────────────────────────
  async updateProfile(userId: string, dto: UpdateUserProfileDto): Promise<UserProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['settings'],
    });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    // 1. Actualizar campos
    Object.assign(profile, dto);

    // 2. Recalcular completeness
    profile.profileCompleteness = this.calculateCompleteness(profile);

    const saved = await this.profileRepo.save(profile);

    // 3. Log activity
    await this.logActivity(userId, ActivityType.PROFILE_UPDATED, 'Perfil actualizado');

    // 4. Publicar evento
    await this.eventPublisher.publish(
      'user.profile.updated',
      { userId, profileCompleteness: saved.profileCompleteness },
      'user-service',
    );

    this.logger.log(`Perfil actualizado: ${userId}`);

    const result = await this.profileRepo.findOne({
      where: { userId },
      relations: ['settings'],
    });
    return result!;
  }

  // ─── UPDATE SETTINGS ──────────────────────────────────────────────
  async updateSettings(userId: string, dto: UpdateUserSettingsDto): Promise<UserSettings> {
    const settings = await this.settingsRepo.findOne({ where: { userId } });

    if (!settings) {
      throw new NotFoundException('Configuración no encontrada');
    }

    Object.assign(settings, dto);
    const saved = await this.settingsRepo.save(settings);

    await this.logActivity(userId, ActivityType.SETTINGS_CHANGED, 'Configuración actualizada');

    this.logger.log(`Settings actualizadas: ${userId}`);

    return saved;
  }

  // ─── GET ACTIVITY LOG ─────────────────────────────────────────────
  async getActivityLog(userId: string, query: ActivityLogQueryDto) {
    const { activityType, startDate, endDate, page = 1, limit = 20 } = query;

    const qb = this.activityLogRepo
      .createQueryBuilder('log')
      .where('log.userId = :userId', { userId })
      .orderBy('log.createdAt', 'DESC');

    if (activityType) {
      qb.andWhere('log.activityType = :activityType', { activityType });
    }
    if (startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate });
    }

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── LOG ACTIVITY ─────────────────────────────────────────────────
  async logActivity(
    userId: string,
    type: ActivityType,
    description?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const log = this.activityLogRepo.create({
      userId,
      activityType: type,
      description: description || null,
      metadata: metadata || null,
    });
    await this.activityLogRepo.save(log);
  }

  // ─── GET BASIC PROFILE (inter-servicio) ───────────────────────────
  async getBasicProfile(userId: string): Promise<{
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    isActive: boolean;
  }> {
    const profile = await this.profileRepo.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return {
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl,
      isActive: true,
    };
  }

  // ─── GET BATCH BASIC PROFILES (inter-servicio) ────────────────────
  async getBatchBasicProfiles(userIds: string[]): Promise<
    Array<{
      userId: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    }>
  > {
    const profiles = await this.profileRepo.find({
      where: { userId: In(userIds) },
    });

    return profiles.map((p) => ({
      userId: p.userId,
      firstName: p.firstName,
      lastName: p.lastName,
      avatarUrl: p.avatarUrl,
    }));
  }

  // ─── CALCULATE COMPLETENESS ───────────────────────────────────────
  private calculateCompleteness(profile: UserProfile): number {
    const fields = [
      profile.firstName,
      profile.lastName,
      profile.phone,
      profile.dateOfBirth,
      profile.gender,
      profile.bio,
      profile.city,
      profile.department,
      profile.avatarUrl,
      profile.websiteUrl,
      profile.linkedinUrl,
    ];

    const filled = fields.filter((f) => f !== null && f !== undefined && f !== '').length;
    return Math.round((filled / fields.length) * 100);
  }
}

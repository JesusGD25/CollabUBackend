import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PROFILE_UPDATED = 'profile_updated',
  AVATAR_CHANGED = 'avatar_changed',
  SETTINGS_CHANGED = 'settings_changed',
  PASSWORD_CHANGED = 'password_changed',
  EMAIL_VERIFIED = 'email_verified',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  ACCOUNT_REACTIVATED = 'account_reactivated',
}

@Entity('activity_log')
@Index('idx_activity_log_user_created', ['userId', 'createdAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'activity_type',
    type: 'enum',
    enum: ActivityType,
  })
  activityType: ActivityType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

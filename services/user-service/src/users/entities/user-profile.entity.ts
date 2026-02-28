import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { UserSettings } from './user-settings.entity';

export enum UserRoleRef {
  STUDENT = 'student',
  COMPANY = 'company',
  ADMIN = 'admin',
  FACULTY = 'faculty',
}

@Entity('user_profiles')
@Index('idx_user_profiles_first_last', ['firstName', 'lastName'])
export class UserProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  role: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ name: 'phone_country_code', type: 'varchar', length: 5, nullable: true })
  phoneCountryCode: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  department: string | null;

  @Column({ type: 'varchar', length: 100, default: 'Colombia' })
  country: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ name: 'website_url', type: 'varchar', length: 500, nullable: true })
  websiteUrl: string | null;

  @Column({ name: 'linkedin_url', type: 'varchar', length: 500, nullable: true })
  linkedinUrl: string | null;

  @Column({ name: 'profile_completeness', type: 'integer', default: 0 })
  profileCompleteness: number;

  @Column({ name: 'is_onboarding_complete', type: 'boolean', default: false })
  isOnboardingComplete: boolean;

  @Column({ name: 'last_active_at', type: 'timestamptz', nullable: true })
  lastActiveAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => UserSettings, (settings) => settings.userProfile, { cascade: true })
  settings: UserSettings;
}

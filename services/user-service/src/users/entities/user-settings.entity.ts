import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';

export enum UiTheme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum UiLanguage {
  ES = 'es',
  EN = 'en',
}

export enum ProfileVisibility {
  PUBLIC = 'public',
  REGISTERED = 'registered',
  PRIVATE = 'private',
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'enum', enum: UiTheme, default: UiTheme.SYSTEM })
  theme: UiTheme;

  @Column({ type: 'enum', enum: UiLanguage, default: UiLanguage.ES })
  language: UiLanguage;

  @Column({
    name: 'profile_visibility',
    type: 'enum',
    enum: ProfileVisibility,
    default: ProfileVisibility.REGISTERED,
  })
  profileVisibility: ProfileVisibility;

  @Column({ name: 'email_notifications', type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ name: 'push_notifications', type: 'boolean', default: true })
  pushNotifications: boolean;

  @Column({ name: 'application_updates', type: 'boolean', default: true })
  applicationUpdates: boolean;

  @Column({ name: 'new_matches', type: 'boolean', default: true })
  newMatches: boolean;

  @Column({ type: 'boolean', default: true })
  messages: boolean;

  @Column({ name: 'evaluation_reminders', type: 'boolean', default: true })
  evaluationReminders: boolean;

  @Column({ name: 'marketing_emails', type: 'boolean', default: false })
  marketingEmails: boolean;

  @Column({ type: 'varchar', length: 50, default: 'America/Bogota' })
  timezone: string;

  @Column({ name: 'date_format', type: 'varchar', length: 20, default: 'DD/MM/YYYY' })
  dateFormat: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => UserProfile, (profile) => profile.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  userProfile: UserProfile;
}

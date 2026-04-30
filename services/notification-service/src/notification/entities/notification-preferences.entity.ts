import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notification_preferences')
export class NotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled: boolean;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled: boolean;

  @Column({ name: 'in_app_enabled', default: true })
  inAppEnabled: boolean;

  @Column({ name: 'application_updates', default: true })
  applicationUpdates: boolean;

  @Column({ name: 'interview_reminders', default: true })
  interviewReminders: boolean;

  @Column({ name: 'evaluation_alerts', default: true })
  evaluationAlerts: boolean;

  @Column({ name: 'match_recommendations', default: true })
  matchRecommendations: boolean;

  @Column({ name: 'project_updates', default: true })
  projectUpdates: boolean;

  @Column({ name: 'chat_messages', default: true })
  chatMessages: boolean;

  @Column({ name: 'system_announcements', default: true })
  systemAnnouncements: boolean;

  @Column({ name: 'quiet_hours_start', type: 'time', nullable: true })
  quietHoursStart: string;

  @Column({ name: 'quiet_hours_end', type: 'time', nullable: true })
  quietHoursEnd: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

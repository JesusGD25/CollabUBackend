import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum NotificationType {
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_ACCEPTED = 'application_accepted',
  APPLICATION_REJECTED = 'application_rejected',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_REMINDER = 'interview_reminder',
  EVALUATION_PENDING = 'evaluation_pending',
  EVALUATION_COMPLETED = 'evaluation_completed',
  PROJECT_NEW = 'project_new',
  PROJECT_DEADLINE_REMINDER = 'project_deadline_reminder',
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  MATCH_RECOMMENDATION = 'match_recommendation',
  MESSAGE_RECEIVED = 'message_received',
  DELIVERABLE_FEEDBACK = 'deliverable_feedback',
  DELIVERABLE_ASSIGNED = 'deliverable_assigned',
  DELIVERABLE_SUBMITTED = 'deliverable_submitted',
  COMPANY_VERIFIED = 'company_verified',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  PROJECT_SUBMITTED_FOR_REVIEW = 'project_submitted_for_review',
  PROJECT_APPROVED = 'project_approved',
  PROJECT_REJECTED = 'project_rejected',
  PROJECT_NEEDS_CHANGES = 'project_needs_changes',
  SUPERVISOR_ASSIGNED = 'supervisor_assigned',
  SUPERVISOR_ACCEPTED = 'supervisor_accepted',
  SUPERVISOR_DECLINED = 'supervisor_declined',
  SUPERVISOR_REPLACED = 'supervisor_replaced',
  ANTEPROYECTO_SUBMITTED = 'anteproyecto_submitted',
  ANTEPROYECTO_CORRECTION_REQUESTED = 'anteproyecto_correction_requested',
  ANTEPROYECTO_APPROVED = 'anteproyecto_approved',
  ANTEPROYECTO_REJECTED = 'anteproyecto_rejected',
  AGREEMENT_UPLOADED = 'agreement_uploaded',
  FINALIZATION_STARTED = 'finalization_started',
  PROGRESS_NEAR_COMPLETION = 'progress_near_completion',
  ACADEMIC_COMPLETED = 'academic_completed',
  DEADLINE_EXTENDED = 'deadline_extended',
  EMAIL_VERIFICATION_REQUESTED = 'email_verification_requested',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date;

  @Column({ name: 'action_url', nullable: true })
  actionUrl: string;

  @Column({ name: 'group_key', nullable: true })
  groupKey: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

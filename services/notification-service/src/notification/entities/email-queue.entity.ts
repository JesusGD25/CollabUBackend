import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

@Entity('email_queue')
export class EmailQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', nullable: true })
  notificationId: string;

  @Column({ name: 'to_email' })
  toEmail: string;

  @Column({ name: 'to_name', nullable: true })
  toName: string;

  @Column()
  subject: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string;

  @Column({ name: 'template_data', type: 'jsonb', nullable: true })
  templateData: Record<string, any>;

  @Column({ name: 'html_content', type: 'text', nullable: true })
  htmlContent: string;

  @Column({ name: 'text_content', type: 'text', nullable: true })
  textContent: string;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.QUEUED })
  status: EmailStatus;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', default: 3 })
  maxAttempts: number;

  @Column({ name: 'last_attempt_at', type: 'timestamptz', nullable: true })
  lastAttemptAt: Date;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'scheduled_for', type: 'timestamptz', nullable: true })
  scheduledFor: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

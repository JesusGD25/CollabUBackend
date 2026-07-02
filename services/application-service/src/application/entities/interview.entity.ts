import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Application } from './application.entity';
export { InterviewType, InterviewStatus } from './enums';
import { InterviewType, InterviewStatus } from './enums';

@Entity('interviews')
@Index('idx_interviews_application', ['applicationId'])
@Index('idx_interviews_scheduled', ['scheduledAt'])
@Index('idx_interviews_status', ['status'])
export class Interview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  scheduledAt: Date;

  @Column({ name: 'duration_minutes', default: 60 })
  durationMinutes: number;

  @Column({ name: 'interview_type', type: 'enum', enum: InterviewType })
  interviewType: InterviewType;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  location: string | null;

  @Column({ name: 'meeting_link', type: 'varchar', nullable: true, length: 500 })
  meetingLink: string | null;

  @Column({ type: 'enum', enum: InterviewStatus, default: InterviewStatus.SCHEDULED })
  status: InterviewStatus;

  @Column({ name: 'interviewer_id', type: 'varchar', nullable: true })
  interviewerId: string | null;

  @Column({ name: 'interviewer_notes', type: 'text', nullable: true })
  interviewerNotes: string | null;

  @Column({ name: 'student_feedback', type: 'text', nullable: true })
  studentFeedback: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number | null;

  @Column({ name: 'cancelled_reason', type: 'text', nullable: true })
  cancelledReason: string | null;

  @Column({ name: 'rescheduled_from', type: 'uuid', nullable: true })
  rescheduledFrom: string | null;

  @Column({ name: 'reminder_sent', default: false })
  reminderSent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Application, (app) => app.interviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;
}

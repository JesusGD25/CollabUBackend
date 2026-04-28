import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { ApplicationTimeline } from './application-timeline.entity';
import { Interview } from './interview.entity';
import { StudentDeliverable } from './student-deliverable.entity';
export { ApplicationStatus } from './enums';
import { ApplicationStatus } from './enums';

@Entity('applications')
@Unique(['projectId', 'studentId'])
@Index('idx_applications_project', ['projectId'])
@Index('idx_applications_student', ['studentId'])
@Index('idx_applications_status', ['status'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @Column({ name: 'cover_letter', type: 'text', nullable: true })
  coverLetter: string | null;

  @Column({ name: 'resume_url', type: 'varchar', nullable: true, length: 500 })
  resumeUrl: string | null;

  @Column({ name: 'portfolio_url', type: 'varchar', nullable: true, length: 500 })
  portfolioUrl: string | null;

  @Column({
    name: 'match_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  matchScore: number | null;

  @Column({
    name: 'applied_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  appliedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'reviewed_by', type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ name: 'withdrawal_reason', type: 'text', nullable: true })
  withdrawalReason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ApplicationTimeline, (timeline) => timeline.application, {
    cascade: true,
  })
  timeline: ApplicationTimeline[];

  @OneToMany(() => Interview, (interview) => interview.application, {
    cascade: true,
  })
  interviews: Interview[];

  @OneToMany(() => StudentDeliverable, (deliverable) => deliverable.application, {
    cascade: true,
  })
  deliverables: StudentDeliverable[];
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SubmissionHistoryAction {
  SUBMITTED = 'submitted',
  ASESOR_COMMENTED = 'asesor_commented',
  CORRECTION_REQUESTED = 'correction_requested',
  REVISED = 'revised',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  DEADLINE_EXTENDED = 'deadline_extended',
}

@Entity('submission_history')
@Index('idx_submission_history_submission', ['submissionId'])
export class SubmissionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'submission_id' })
  submissionId: string;

  @Column({ type: 'enum', enum: SubmissionHistoryAction })
  action: SubmissionHistoryAction;

  @Column({ name: 'actor_id', type: 'uuid' })
  actorId: string;

  @Column({ name: 'actor_role', length: 50 })
  actorRole: string;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'file_id', type: 'uuid', nullable: true })
  fileId: string | null;

  @Column({ name: 'version_number', type: 'int', nullable: true })
  versionNumber: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

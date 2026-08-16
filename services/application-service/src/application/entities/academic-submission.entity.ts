import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SubmissionType {
  ANTEPROYECTO = 'anteproyecto',
  FINAL_DOCUMENT = 'final_document',
  OTHER = 'other',
}

export enum SubmissionStatus {
  PENDING_SUBMISSION = 'pending_submission',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  NEEDS_REVISION = 'needs_revision',
  REVISED = 'revised',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('academic_submissions')
@Index('idx_academic_submissions_application', ['applicationId'])
export class AcademicSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'submission_type', type: 'enum', enum: SubmissionType, default: SubmissionType.ANTEPROYECTO })
  submissionType: SubmissionType;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.PENDING_SUBMISSION })
  status: SubmissionStatus;

  @Column({ name: 'current_file_id', type: 'uuid', nullable: true })
  currentFileId: string | null;

  @Column({ name: 'version_number', default: 0 })
  versionNumber: number;

  @Column({ name: 'correction_count', default: 0 })
  correctionCount: number;

  /**
   * Votos de los jurados activos para la versión actual — {supervisorUserId: 'approve'|'reject'}.
   * Se resetea a null en cada (re)entrega. Aprobación requiere unanimidad; un solo
   * voto "reject" (una vez que todos votaron) rechaza el anteproyecto.
   */
  @Column({ name: 'jurado_votes', type: 'jsonb', nullable: true })
  juradoVotes: Record<string, 'approve' | 'reject'> | null;

  @Column({ name: 'reviewer_comments', type: 'text', nullable: true })
  reviewerComments: string | null;

  @Column({ name: 'asesor_comments', type: 'text', nullable: true })
  asesorComments: string | null;

  @Column({ name: 'student_response', type: 'text', nullable: true })
  studentResponse: string | null;

  @Column({ name: 'deadline_for_review', type: 'timestamptz', nullable: true })
  deadlineForReview: Date | null;

  @Column({ name: 'deadline_for_student', type: 'timestamptz', nullable: true })
  deadlineForStudent: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

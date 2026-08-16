import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AcademicRecordStatus {
  WAITING_ANTEPROYECTO = 'waiting_anteproyecto',
  WAITING_DOCUMENTS = 'waiting_documents',
  WAITING_AGREEMENT = 'waiting_agreement',
  ACTIVE = 'active',
  WAITING_FINAL_DOCS = 'waiting_final_docs',
  FINAL_DOCS_REVIEW = 'final_docs_review',
  FINALIZING = 'finalizing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('project_academic_records')
export class ProjectAcademicRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', unique: true })
  applicationId: string;

  @Column({ name: 'supervisor_assignment_id', type: 'uuid' })
  supervisorAssignmentId: string;

  @Column({ name: 'anteproyecto_submission_id', type: 'uuid', nullable: true })
  anteproyectoSubmissionId: string | null;

  @Column({ name: 'initiation_agreement_file_id', type: 'uuid', nullable: true })
  initiationAgreementFileId: string | null;

  @Column({ name: 'official_start_date', type: 'date', nullable: true })
  officialStartDate: Date | null;

  @Column({ name: 'agreed_duration_weeks', type: 'int', nullable: true })
  agreedDurationWeeks: number | null;

  @Column({ name: 'expected_end_date', type: 'date', nullable: true })
  expectedEndDate: Date | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate: Date | null;

  @Column({ name: 'final_grade_file_id', type: 'uuid', nullable: true })
  finalGradeFileId: string | null;

  @Column({ name: 'final_grade_value', type: 'decimal', precision: 3, scale: 2, nullable: true })
  finalGradeValue: string | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({
    type: 'enum',
    enum: AcademicRecordStatus,
    default: AcademicRecordStatus.WAITING_ANTEPROYECTO,
  })
  status: AcademicRecordStatus;

  @Column({ name: 'asesor_completion_signal', default: false })
  asesorCompletionSignal: boolean;

  /** Evita reenviar la sugerencia de iniciar finalización al llegar al 90% de progreso temporal. */
  @Column({ name: 'progress_alert_sent', default: false })
  progressAlertSent: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

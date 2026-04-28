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
export { DeliverableStatus } from './enums';
import { DeliverableStatus } from './enums';

@Entity('student_deliverables')
@Index('idx_student_deliverables_application', ['applicationId'])
@Index('idx_student_deliverables_status', ['status'])
export class StudentDeliverable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  /** Referencia lógica al entregable del proyecto (project_db.project_deliverables) */
  @Column({ name: 'project_deliverable_id', type: 'uuid', nullable: true })
  projectDeliverableId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'file_url', type: 'varchar', nullable: true, length: 500 })
  fileUrl: string | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'file_type', type: 'varchar', nullable: true, length: 100 })
  fileType: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'enum', enum: DeliverableStatus, default: DeliverableStatus.PENDING })
  status: DeliverableStatus;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  grade: number | null;

  @Column({ name: 'reviewed_by', type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'revision_number', default: 1 })
  revisionNumber: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Application, (app) => app.deliverables, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;
}

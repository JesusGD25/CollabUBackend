import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Application } from './application.entity';
import { DeliverableAttachment } from './deliverable-attachment.entity';
export { DeliverableStatus, DeliverableType, RequesterType } from './enums';
import { DeliverableStatus, DeliverableType, RequesterType } from './enums';

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

  @Column({ type: 'enum', enum: DeliverableType, nullable: true })
  type: DeliverableType | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'created_by_user_id', type: 'varchar', nullable: true })
  createdByUserId: string | null;

  /** Quién lo solicitó — determina visibilidad (default company para retrocompatibilidad). */
  @Column({ name: 'requester_type', type: 'enum', enum: RequesterType, default: RequesterType.COMPANY })
  requesterType: RequesterType;

  @Column({ name: 'template_file_id', type: 'uuid', nullable: true })
  templateFileId: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;

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

  @Column({ name: 'reviewed_by_role', type: 'varchar', length: 50, nullable: true })
  reviewedByRole: string | null;

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

  @OneToMany(() => DeliverableAttachment, (a) => a.deliverable)
  attachments: DeliverableAttachment[];
}

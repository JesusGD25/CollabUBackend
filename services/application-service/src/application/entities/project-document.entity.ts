import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProjectDocumentStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Distingue si el documento responde a un requisito del catálogo global
 * del admin (pre_initiation/post_initiation) o a uno definido ad-hoc por
 * el admin al iniciar la finalización del proyecto.
 */
export enum ProjectDocumentStage {
  INITIAL = 'initial',
  FINAL = 'final',
}

@Entity('project_documents')
@Index('idx_project_documents_application', ['applicationId'])
export class ProjectDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'requirement_id', type: 'uuid' })
  requirementId: string;

  @Column({ name: 'requirement_name', length: 200 })
  requirementName: string;

  @Column({ type: 'enum', enum: ProjectDocumentStage, default: ProjectDocumentStage.INITIAL })
  stage: ProjectDocumentStage;

  @Column({ name: 'actor_type', type: 'varchar', length: 20, nullable: true })
  actorType: string | null;

  @Column({ name: 'submitted_by', type: 'uuid', nullable: true })
  submittedBy: string | null;

  @Column({ name: 'file_id', type: 'uuid', nullable: true })
  fileId: string | null;

  @Column({ type: 'enum', enum: ProjectDocumentStatus, default: ProjectDocumentStatus.PENDING })
  status: ProjectDocumentStatus;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId: string | null;

  @Column({ name: 'reviewer_comment', type: 'text', nullable: true })
  reviewerComment: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

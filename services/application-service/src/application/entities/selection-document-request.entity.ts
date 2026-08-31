import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Documento solicitado por la empresa al estudiante durante la fase de
 * selección (antes de que exista `ProjectAcademicRecord`) — p. ej. una
 * prueba técnica, un certificado, una referencia. Siempre 1:1 empresa→estudiante,
 * a diferencia de los documentos finales (que pueden pedir a varios actores),
 * así que se modela en una sola entidad sin separar requisito/entrega.
 */
export enum SelectionDocumentStatus {
  REQUESTED = 'requested',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('selection_document_requests')
@Index('idx_selection_doc_application', ['applicationId'])
export class SelectionDocumentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'requested_by', type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'enum', enum: SelectionDocumentStatus, default: SelectionDocumentStatus.REQUESTED })
  status: SelectionDocumentStatus;

  @Column({ name: 'file_id', type: 'uuid', nullable: true })
  fileId: string | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'reviewer_id', type: 'uuid', nullable: true })
  reviewerId: string | null;

  @Column({ name: 'reviewer_comment', type: 'text', nullable: true })
  reviewerComment: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

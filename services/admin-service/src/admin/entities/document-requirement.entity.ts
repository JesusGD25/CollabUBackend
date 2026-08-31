import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DocumentActorType {
  STUDENT = 'student',
  COMPANY = 'company',
}

export enum DocumentRequiredStage {
  PRE_INITIATION = 'pre_initiation',
  POST_INITIATION = 'post_initiation',
  FINALIZATION = 'finalization',
}

@Entity('document_requirements')
export class DocumentRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'actor_type', type: 'enum', enum: DocumentActorType })
  actorType: DocumentActorType;

  @Column({ name: 'required_at_stage', type: 'enum', enum: DocumentRequiredStage })
  requiredAtStage: DocumentRequiredStage;

  @Column({ name: 'project_types', type: 'text', array: true, default: () => "'{all}'" })
  projectTypes: string[];

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'allowed_mime_types', type: 'text', array: true, nullable: true })
  allowedMimeTypes: string[] | null;

  @Column({ name: 'max_size_bytes', type: 'bigint', nullable: true })
  maxSizeBytes: number | null;

  @Column({ name: 'has_expiry', default: false })
  hasExpiry: boolean;

  /** Formato/plantilla opcional (Storage Service) que el actor puede descargar como guía. */
  @Column({ name: 'template_file_id', type: 'uuid', nullable: true })
  templateFileId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

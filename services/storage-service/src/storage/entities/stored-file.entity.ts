import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { FileVersion } from './file-version.entity';

export enum FileCategory {
  AVATAR = 'avatar',
  CV = 'cv',
  PORTFOLIO = 'portfolio',
  DELIVERABLE = 'deliverable',
  COMPANY_LOGO = 'company_logo',
  COMPANY_DOCUMENT = 'company_document',
  CHAT_ATTACHMENT = 'chat_attachment',
  REPORT = 'report',
  INTERVIEW_ATTACHMENT = 'interview_attachment',
  TEMPLATE = 'template',
  ACADEMIC_DOCUMENT = 'academic_document',
  PROJECT_DOCUMENT = 'project_document',
  OTHER = 'other',
}

export enum FileStatus {
  UPLOADING = 'uploading',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity('files')
@Index('idx_files_owner', ['ownerId'])
@Index('idx_files_category', ['category'])
@Index('idx_files_entity', ['entityType', 'entityId'])
@Index('idx_files_status', ['status'])
export class StoredFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'stored_name', length: 255, unique: true })
  storedName: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @Column({
    type: 'enum',
    enum: FileCategory,
    default: FileCategory.OTHER,
  })
  category: FileCategory;

  @Column({ name: 'entity_type', length: 50, nullable: true })
  entityType: string;

  @Column({ name: 'entity_id', type: 'uuid', nullable: true })
  entityId: string;

  @Column({ name: 'storage_path', length: 500 })
  storagePath: string;

  @Column({ name: 'public_url', length: 500, nullable: true })
  publicUrl: string;

  @Column({ name: 'thumbnail_url', length: 500, nullable: true })
  thumbnailUrl: string;

  @Column({ length: 64, nullable: true })
  checksum: string;

  @Column({
    type: 'enum',
    enum: FileStatus,
    default: FileStatus.ACTIVE,
  })
  status: FileStatus;

  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => FileVersion, (v) => v.file)
  versions: FileVersion[];
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { StoredFile } from './stored-file.entity';

@Entity('file_versions')
@Unique('uq_file_version', ['fileId', 'versionNumber'])
@Index('idx_file_versions_file', ['fileId'])
export class FileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_id' })
  fileId: string;

  @Column({ name: 'version_number' })
  versionNumber: number;

  @Column({ name: 'stored_name', length: 255 })
  storedName: string;

  @Column({ name: 'storage_path', length: 500 })
  storagePath: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes: number;

  @Column({ length: 64, nullable: true })
  checksum: string;

  @Column({ name: 'uploaded_by' })
  uploadedBy: string;

  @Column({ name: 'change_note', type: 'text', nullable: true })
  changeNote: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => StoredFile, (f) => f.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: StoredFile;
}

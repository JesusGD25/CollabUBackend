import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('storage_quotas')
@Index('idx_storage_quotas_user', ['userId'])
export class StorageQuota {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column({ name: 'max_storage_bytes', type: 'bigint', default: 104857600 })
  maxStorageBytes: number;

  @Column({ name: 'used_storage_bytes', type: 'bigint', default: 0 })
  usedStorageBytes: number;

  @Column({ name: 'max_file_size_bytes', type: 'bigint', default: 10485760 })
  maxFileSizeBytes: number;

  @Column({ name: 'total_files', default: 0 })
  totalFiles: number;

  @Column({ name: 'max_files', default: 100 })
  maxFiles: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

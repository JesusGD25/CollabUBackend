import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { StudentDeliverable } from './student-deliverable.entity';

@Entity('deliverable_attachments')
@Index('idx_attachments_deliverable', ['deliverableId'])
export class DeliverableAttachment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deliverable_id' })
  deliverableId: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_size_bytes', type: 'bigint', nullable: true })
  fileSizeBytes: number | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'uploaded_by_user_id', type: 'varchar', nullable: true })
  uploadedByUserId: string | null;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;

  @ManyToOne(() => StudentDeliverable, (d) => d.attachments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deliverable_id' })
  deliverable: StudentDeliverable;
}
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('deliverable_comments')
@Index('idx_deliverable_comments_deliverable', ['deliverableId'])
export class DeliverableComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'deliverable_id' })
  deliverableId: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'author_role', length: 50 })
  authorRole: string;

  @Column({ type: 'text' })
  content: string;

  /** true = solo admin y asesor lo ven (comentarios internos del asesor en sus propios entregables). */
  @Column({ name: 'is_internal', default: false })
  isInternal: boolean;

  @Column({ name: 'attachment_file_id', type: 'uuid', nullable: true })
  attachmentFileId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

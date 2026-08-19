import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  PROJECT = 'project',
}

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ConversationType, default: ConversationType.DIRECT })
  type: ConversationType;

  @Column({ nullable: true, length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string;

  // Discrimina conversaciones de tipo PROJECT por postulación: sin esto, todos
  // los estudiantes que aplican al mismo proyecto terminaban agregados a una
  // única conversación compartida (bug de privacidad — veían mensajes entre
  // la empresa y otros candidatos). Nullable para no romper conversaciones
  // GROUP/DIRECT existentes, que no aplican este concepto.
  @Column({ name: 'application_id', type: 'uuid', nullable: true })
  applicationId: string;

  @Column({ name: 'avatar_url', nullable: true, length: 500 })
  avatarUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'last_message_preview', nullable: true, length: 255 })
  lastMessagePreview: string;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany('ConversationParticipant', 'conversation')
  participants: any[];

  @OneToMany('Message', 'conversation')
  messages: any[];
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

export enum ParticipantRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  OWNER = 'owner',
}

@Entity('conversation_participants')
export class ConversationParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: ParticipantRole, default: ParticipantRole.MEMBER })
  role: ParticipantRole;

  @Column({ nullable: true, length: 100 })
  nickname: string;

  @Column({ name: 'is_muted', default: false })
  isMuted: boolean;

  @Column({ name: 'last_read_at', type: 'timestamptz', nullable: true })
  lastReadAt: Date;

  @Column({ name: 'last_read_message_id', type: 'uuid', nullable: true })
  lastReadMessageId: string | null;

  @Column({ name: 'unread_count', default: 0 })
  unreadCount: number;

  @Column({ name: 'joined_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamptz', nullable: true })
  leftAt: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ManyToOne(() => Conversation, (c) => c.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 10 })
  emoji: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Message, (m) => m.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: Message;
}

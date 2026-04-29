import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { MatchResult } from './match-result.entity';
export { FeedbackType } from './enums';
import { FeedbackType } from './enums';

@Entity('match_feedback')
@Unique(['matchResultId', 'userId'])
@Index('idx_match_feedback_result', ['matchResultId'])
export class MatchFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_result_id', type: 'varchar' })
  matchResultId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'feedback_type', type: 'enum', enum: FeedbackType })
  feedbackType: FeedbackType;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => MatchResult, (result) => result.feedback, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_result_id' })
  matchResult: MatchResult;
}

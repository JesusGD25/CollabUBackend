import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MatchResult } from './match-result.entity';
export { TargetType, RecommendationType } from './enums';
import { TargetType, RecommendationType } from './enums';

@Entity('match_recommendations')
@Index('idx_recommendations_target', ['targetUserId', 'targetType'])
@Index('idx_recommendations_unseen', ['targetUserId', 'isSeen'])
@Index('idx_recommendations_match', ['matchResultId'])
export class MatchRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_result_id', type: 'varchar' })
  matchResultId: string;

  @Column({ name: 'target_user_id', type: 'varchar' })
  targetUserId: string;

  @Column({ name: 'target_type', type: 'enum', enum: TargetType })
  targetType: TargetType;

  @Column({ name: 'recommendation_type', type: 'enum', enum: RecommendationType })
  recommendationType: RecommendationType;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'is_seen', default: false })
  isSeen: boolean;

  @Column({ name: 'seen_at', type: 'timestamptz', nullable: true })
  seenAt: Date | null;

  @Column({ name: 'is_dismissed', default: false })
  isDismissed: boolean;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => MatchResult, (result) => result.recommendations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'match_result_id' })
  matchResult: MatchResult;
}

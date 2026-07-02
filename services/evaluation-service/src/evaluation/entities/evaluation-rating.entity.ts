import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { EvaluationCriteria } from './evaluation-criteria.entity';

@Entity('evaluation_ratings')
export class EvaluationRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'evaluation_id' })
  evaluationId: string;

  @Column({ name: 'criterion_id' })
  criterionId: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Evaluation, (e) => e.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_id' })
  evaluation: Evaluation;

  @ManyToOne(() => EvaluationCriteria)
  @JoinColumn({ name: 'criterion_id' })
  criterion: EvaluationCriteria;
}

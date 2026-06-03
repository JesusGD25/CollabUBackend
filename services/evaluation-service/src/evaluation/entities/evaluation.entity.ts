import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EvaluationType, EvaluationStatus } from './enums';
import { EvaluationRating } from './evaluation-rating.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'evaluator_id' })
  evaluatorId: string;

  @Column({ name: 'evaluated_id' })
  evaluatedId: string;

  @Column({ name: 'evaluation_type', type: 'enum', enum: EvaluationType })
  evaluationType: EvaluationType;

  @Column({ type: 'enum', enum: EvaluationStatus, default: EvaluationStatus.PENDING })
  status: EvaluationStatus;

  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore: number | null;

  @Column({ name: 'overall_comment', type: 'text', nullable: true })
  overallComment: string | null;

  @Column({ type: 'text', nullable: true })
  strengths: string | null;

  @Column({ name: 'areas_for_improvement', type: 'text', nullable: true })
  areasForImprovement: string | null;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => EvaluationRating, (r) => r.evaluation)
  ratings: EvaluationRating[];
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CriterionCategory, EvaluationType, RatingScale } from './enums';

@Entity('evaluation_criteria')
export class EvaluationCriteria {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: CriterionCategory })
  category: CriterionCategory;

  @Column({ name: 'evaluation_type', type: 'enum', enum: EvaluationType })
  evaluationType: EvaluationType;

  @Column({ type: 'decimal', precision: 4, scale: 3, default: 1 })
  weight: number;

  @Column({
    name: 'rating_scale',
    type: 'enum',
    enum: RatingScale,
    default: RatingScale.ONE_TO_FIVE,
  })
  ratingScale: RatingScale;

  @Column({ name: 'is_required', default: true })
  isRequired: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

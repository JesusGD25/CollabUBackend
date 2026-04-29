import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { MatchRecommendation } from './match-recommendation.entity';
import { MatchFeedback } from './match-feedback.entity';
export { CompatibilityLevel } from './enums';
import { CompatibilityLevel } from './enums';

@Entity('match_results')
@Unique(['studentId', 'projectId'])
@Index('idx_match_results_student', ['studentId'])
@Index('idx_match_results_project', ['projectId'])
@Index('idx_match_results_level', ['compatibilityLevel'])
@Index('idx_match_results_recommended', ['isRecommended'])
export class MatchResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'varchar' })
  studentId: string;

  @Column({ name: 'project_id', type: 'varchar' })
  projectId: string;

  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2 })
  overallScore: number;

  @Column({ name: 'skills_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skillsScore: number | null;

  @Column({ name: 'proficiency_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  proficiencyScore: number | null;

  @Column({ name: 'program_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  programScore: number | null;

  @Column({ name: 'semester_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  semesterScore: number | null;

  @Column({ name: 'availability_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  availabilityScore: number | null;

  @Column({ name: 'experience_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  experienceScore: number | null;

  @Column({ name: 'language_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  languageScore: number | null;

  @Column({ name: 'weights_snapshot', type: 'jsonb' })
  weightsSnapshot: Record<string, number>;

  @Column({
    name: 'compatibility_level',
    type: 'enum',
    enum: CompatibilityLevel,
    nullable: true,
  })
  compatibilityLevel: CompatibilityLevel | null;

  @Column({ name: 'is_recommended', default: false })
  isRecommended: boolean;

  @Column({
    name: 'calculated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  calculatedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => MatchRecommendation, (rec) => rec.matchResult)
  recommendations: MatchRecommendation[];

  @OneToMany(() => MatchFeedback, (fb) => fb.matchResult)
  feedback: MatchFeedback[];
}

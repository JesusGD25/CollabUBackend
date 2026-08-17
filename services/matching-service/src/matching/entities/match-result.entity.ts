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

export interface SkillsBreakdownEntry {
  name: string;
  catalogSkillId: string | null;
  requiredLevel: string | null;
  studentLevel: string | null;
}

export interface SkillsBreakdown {
  matched: SkillsBreakdownEntry[];
  missing: SkillsBreakdownEntry[];
  extra: { name: string; catalogSkillId: string | null; studentLevel: string | null }[];
}

/**
 * TypeORM devuelve columnas `decimal` como string en cualquier lectura que no pase por
 * `.save()` en el mismo ciclo (p.ej. `createQueryBuilder().getMany()`, usado por
 * `getRecommendations`) — sin este transformer, `overallScore` llega como `"100.00"` (string)
 * a veces y `100` (number) otras, según el camino de lectura. Detectado en FASE 7
 * (matching-integration.e2e-spec.ts) comparando `POST /calculate` (number, entidad recién
 * guardada en memoria) contra `GET /recommendations` (string, releído de la DB).
 */
const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

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

  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2, transformer: decimalTransformer })
  overallScore: number;

  @Column({ name: 'skills_score', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  skillsScore: number | null;

  @Column({ name: 'proficiency_score', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  proficiencyScore: number | null;

  @Column({ name: 'program_score', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  programScore: number | null;

  @Column({ name: 'semester_score', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  semesterScore: number | null;

  @Column({ name: 'availability_score', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  availabilityScore: number | null;

  @Column({ name: 'language_score', type: 'decimal', precision: 5, scale: 2, nullable: true, transformer: decimalTransformer })
  languageScore: number | null;

  @Column({ name: 'weights_snapshot', type: 'jsonb' })
  weightsSnapshot: Record<string, number>;

  @Column({ name: 'skills_breakdown', type: 'jsonb', nullable: true })
  skillsBreakdown: SkillsBreakdown | null;

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

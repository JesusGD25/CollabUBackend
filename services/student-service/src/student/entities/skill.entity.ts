import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { StudentProfile } from './student-profile.entity';

export enum SkillCategory {
  LANGUAGE = 'language',
  FRAMEWORK = 'framework',
  TOOL = 'tool',
  CONCEPT = 'concept',
  SOFT_SKILL = 'soft_skill',
}

export enum ProficiencyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

@Entity('skills')
@Unique('uq_skill_student_name', ['studentId', 'name'])
@Index('idx_skills_student_category', ['studentId', 'category'])
export class Skill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** Referencia al catálogo maestro de habilidades (admin-service). null = habilidad libre. */
  @Column({ name: 'catalog_skill_id', type: 'uuid', nullable: true })
  catalogSkillId: string | null;

  @Column({ type: 'enum', enum: SkillCategory })
  category: SkillCategory;

  @Column({
    name: 'proficiency_level',
    type: 'enum',
    enum: ProficiencyLevel,
    default: ProficiencyLevel.BEGINNER,
  })
  proficiencyLevel: ProficiencyLevel;

  @Column({
    name: 'years_of_experience',
    type: 'decimal',
    precision: 4,
    scale: 1,
    default: 0.0,
  })
  yearsOfExperience: number;

  @Column({ name: 'is_verified', type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', type: 'varchar', length: 255, nullable: true })
  verifiedBy: string | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StudentProfile, (profile) => profile.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;
}

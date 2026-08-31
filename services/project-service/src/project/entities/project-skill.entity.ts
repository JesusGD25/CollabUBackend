import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Project } from './project.entity';

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

@Entity('project_skills')
@Unique(['projectId', 'name'])
export class ProjectSkill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ length: 100 })
  name: string;

  /** Referencia al catálogo maestro de habilidades (admin-service). null = habilidad libre. */
  @Column({ name: 'catalog_skill_id', type: 'uuid', nullable: true })
  catalogSkillId: string | null;

  @Column({ type: 'enum', enum: SkillCategory })
  category: SkillCategory;

  @Column({ name: 'proficiency_level', type: 'enum', enum: ProficiencyLevel, nullable: true })
  proficiencyLevel: ProficiencyLevel | null;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Project, (project) => project.skills, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}

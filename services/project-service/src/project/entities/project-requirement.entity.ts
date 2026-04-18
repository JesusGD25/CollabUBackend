import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum RequirementType {
  SKILL = 'skill',
  EDUCATION = 'education',
  EXPERIENCE = 'experience',
  LANGUAGE = 'language',
  CERTIFICATION = 'certification',
  OTHER = 'other',
}

@Entity('project_requirements')
export class ProjectRequirement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'requirement_type', type: 'enum', enum: RequirementType })
  requirementType: RequirementType;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_mandatory', default: true })
  isMandatory: boolean;

  @Column({ name: 'proficiency_level', nullable: true })
  proficiencyLevel: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Project, (project) => project.requirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}

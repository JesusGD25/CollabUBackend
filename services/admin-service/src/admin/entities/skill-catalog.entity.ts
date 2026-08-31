import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SkillCategory {
  LANGUAGE = 'language',
  FRAMEWORK = 'framework',
  TOOL = 'tool',
  CONCEPT = 'concept',
  SOFT_SKILL = 'soft_skill',
}

@Entity('skill_catalog')
export class SkillCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  name: string;

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ type: 'enum', enum: SkillCategory })
  category: SkillCategory;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

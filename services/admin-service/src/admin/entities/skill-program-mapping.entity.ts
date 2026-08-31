import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

@Entity('skill_program_mapping')
@Unique(['skillId', 'programId'])
export class SkillProgramMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'skill_id', type: 'uuid' })
  skillId: string;

  @Index()
  @Column({ name: 'program_id', type: 'uuid' })
  programId: string;

  @Column({ name: 'display_order', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

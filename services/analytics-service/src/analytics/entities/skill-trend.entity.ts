import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('skill_trends')
export class SkillTrend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'skill_name', length: 100 })
  skillName: string;

  @Column({ name: 'demand_count', default: 0 })
  demandCount: number;

  @Column({ name: 'supply_count', default: 0 })
  supplyCount: number;

  @Column({ name: 'gap_index', type: 'decimal', precision: 5, scale: 2, nullable: true })
  gapIndex: number | null;

  @Column({ name: 'avg_proficiency_level', type: 'decimal', precision: 3, scale: 2, nullable: true })
  avgProficiencyLevel: number | null;

  @Column({ name: 'trend_direction', type: 'varchar', length: 20, nullable: true })
  trendDirection: 'rising' | 'stable' | 'declining' | null;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

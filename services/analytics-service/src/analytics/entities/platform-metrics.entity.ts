import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('platform_metrics')
export class PlatformMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'total_users', default: 0 })
  totalUsers: number;

  @Column({ name: 'total_students', default: 0 })
  totalStudents: number;

  @Column({ name: 'total_companies', default: 0 })
  totalCompanies: number;

  @Column({ name: 'total_projects', default: 0 })
  totalProjects: number;

  @Column({ name: 'total_applications', default: 0 })
  totalApplications: number;

  @Column({ name: 'active_projects', default: 0 })
  activeProjects: number;

  @Column({ name: 'avg_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgMatchScore: number | null;

  @Column({ name: 'avg_time_to_fill_days', type: 'int', nullable: true })
  avgTimeToFillDays: number | null;

  @Column({ name: 'new_users_period', default: 0 })
  newUsersPeriod: number;

  @Column({ name: 'new_projects_period', default: 0 })
  newProjectsPeriod: number;

  @Column({ name: 'snapshot_date', type: 'date', unique: true })
  snapshotDate: Date;

  @Column({ name: 'period_id', type: 'uuid', nullable: true })
  periodId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

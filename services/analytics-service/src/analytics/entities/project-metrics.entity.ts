import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('project_metrics')
export class ProjectMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'period_id', type: 'uuid', nullable: true })
  periodId: string | null;

  // periodId uses explicit 'uuid' type — no change needed

  @Column({ name: 'total_applications', default: 0 })
  totalApplications: number;

  @Column({ name: 'accepted_applications', default: 0 })
  acceptedApplications: number;

  @Column({ name: 'rejected_applications', default: 0 })
  rejectedApplications: number;

  @Column({ name: 'avg_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgMatchScore: number | null;

  @Column({ name: 'avg_time_to_fill_days', type: 'int', nullable: true })
  avgTimeToFillDays: number | null;

  @Column({ name: 'completion_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  completionRate: number | null;

  @Column({ name: 'avg_evaluation_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgEvaluationScore: number | null;

  @Column({ name: 'total_views', default: 0 })
  totalViews: number;

  @Column({ name: 'conversion_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  conversionRate: number | null;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

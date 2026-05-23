import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('company_metrics')
export class CompanyMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'total_projects', default: 0 })
  totalProjects: number;

  @Column({ name: 'active_projects', default: 0 })
  activeProjects: number;

  @Column({ name: 'total_applications_received', default: 0 })
  totalApplicationsReceived: number;

  @Column({ name: 'avg_time_to_respond_hours', type: 'int', nullable: true })
  avgTimeToRespondHours: number | null;

  @Column({ name: 'avg_evaluation_given', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgEvaluationGiven: number | null;

  @Column({ name: 'avg_evaluation_received', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgEvaluationReceived: number | null;

  @Column({ name: 'total_students_hired', default: 0 })
  totalStudentsHired: number;

  @Column({ name: 'completion_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  completionRate: number | null;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

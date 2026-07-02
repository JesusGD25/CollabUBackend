import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export type ReportType =
  | 'period_summary'
  | 'company_performance'
  | 'student_outcomes'
  | 'skill_gap_analysis'
  | 'matching_effectiveness'
  | 'custom';

export type ReportStatus = 'generating' | 'completed' | 'failed';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'report_type', type: 'varchar', length: 50 })
  reportType: ReportType;

  @Column({ name: 'generated_by' })
  generatedBy: string;

  @Column({ name: 'period_id', type: 'uuid', nullable: true })
  periodId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, any> | null;

  @Column({ type: 'jsonb' })
  data: Record<string, any>;

  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'completed' })
  status: ReportStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

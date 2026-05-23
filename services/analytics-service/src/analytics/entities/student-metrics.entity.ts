import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('student_metrics')
export class StudentMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'total_applications', default: 0 })
  totalApplications: number;

  @Column({ name: 'accepted_count', default: 0 })
  acceptedCount: number;

  @Column({ name: 'rejected_count', default: 0 })
  rejectedCount: number;

  @Column({ name: 'avg_match_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgMatchScore: number | null;

  @Column({ name: 'profile_completeness', default: 0 })
  profileCompleteness: number;

  @Column({ name: 'avg_evaluation_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  avgEvaluationScore: number | null;

  @Column({ name: 'total_projects_completed', default: 0 })
  totalProjectsCompleted: number;

  @Column({ name: 'skills_count', default: 0 })
  skillsCount: number;

  @Column({ name: 'response_rate', type: 'decimal', precision: 5, scale: 2, nullable: true })
  responseRate: number | null;

  @Column({ name: 'snapshot_date', type: 'date' })
  snapshotDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

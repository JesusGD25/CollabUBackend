import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ActivityPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('project_activities')
export class ProjectActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ name: 'student_id', nullable: true })
  studentId: string;

  @Column({ name: 'assigned_by', nullable: true })
  assignedBy: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'activity_type' })
  activityType: string;

  @Column({ name: 'scheduled_date', type: 'timestamptz', nullable: true })
  scheduledDate: Date;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date;

  @Column({ name: 'completed_date', type: 'timestamptz', nullable: true })
  completedDate: Date;

  @Column({ type: 'enum', enum: ActivityStatus, default: ActivityStatus.PENDING })
  status: ActivityStatus;

  @Column({ type: 'enum', enum: ActivityPriority, default: ActivityPriority.MEDIUM })
  priority: ActivityPriority;

  @Column({ name: 'hours_estimated', type: 'decimal', precision: 5, scale: 1, nullable: true })
  hoursEstimated: number;

  @Column({ name: 'hours_actual', type: 'decimal', precision: 5, scale: 1, nullable: true })
  hoursActual: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Project, (project) => project.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;
}

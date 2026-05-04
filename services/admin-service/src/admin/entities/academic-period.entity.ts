import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PeriodStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

@Entity('academic_periods')
export class AcademicPeriod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'enrollment_start', type: 'date', nullable: true })
  enrollmentStart: string;

  @Column({ name: 'enrollment_end', type: 'date', nullable: true })
  enrollmentEnd: string;

  @Column({ type: 'enum', enum: PeriodStatus, default: PeriodStatus.PLANNING })
  status: PeriodStatus;

  @Column({ name: 'is_current', default: false })
  isCurrent: boolean;

  @Column({ name: 'max_projects_per_company', default: 10 })
  maxProjectsPerCompany: number;

  @Column({ name: 'max_applications_per_student', default: 5 })
  maxApplicationsPerStudent: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Supervisor } from './supervisor.entity';
import { AcademicPeriod } from './academic-period.entity';

@Entity('supervisor_assignments')
@Unique(['studentId', 'projectId'])
export class SupervisorAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supervisor_id', type: 'uuid' })
  supervisorId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedBy: string;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({
    default: 'active',
    length: 50,
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Supervisor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: Supervisor;

  @ManyToOne(() => AcademicPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'period_id' })
  period: AcademicPeriod;
}

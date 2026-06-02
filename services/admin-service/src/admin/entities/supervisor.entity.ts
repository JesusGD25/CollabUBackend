import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SupervisorRole {
  ACADEMIC_DIRECTOR = 'academic_director',
  INTERNSHIP_COORDINATOR = 'internship_coordinator',
  THESIS_ADVISOR = 'thesis_advisor',
  FACULTY_SUPERVISOR = 'faculty_supervisor',
}

@Entity('supervisors')
export class Supervisor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true, type: 'uuid' })
  userId: string;

  @Column({ name: 'employee_code', unique: true, nullable: true, length: 50 })
  employeeCode: string;

  @Column({ nullable: true, length: 200 })
  department: string;

  @Column({ type: 'enum', enum: SupervisorRole })
  role: SupervisorRole;

  @Column({ nullable: true, length: 200 })
  specialization: string;

  @Column({ name: 'max_students', default: 10 })
  maxStudents: number;

  @Column({ name: 'current_students', default: 0 })
  currentStudents: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_onboarding_complete', default: false })
  isOnboardingComplete: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

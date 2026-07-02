import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { StudentProfile } from './student-profile.entity';

export enum ExperienceType {
  WORK = 'work',
  INTERNSHIP = 'internship',
  VOLUNTEER = 'volunteer',
  ACADEMIC = 'academic',
  FREELANCE = 'freelance',
}

@Entity('experiences')
@Index('idx_experiences_student_type', ['studentId', 'type'])
export class Experience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'enum', enum: ExperienceType })
  type: ExperienceType;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'company_name', type: 'varchar', length: 200, nullable: true })
  companyName: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  responsibilities: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  location: string | null;

  @Column({ name: 'work_mode', type: 'varchar', length: 50, nullable: true })
  workMode: string | null;

  @Column({ type: 'text', array: true, nullable: true })
  achievements: string[] | null;

  @Column({ name: 'technologies_used', type: 'text', array: true, nullable: true })
  technologiesUsed: string[] | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StudentProfile, (profile) => profile.experiences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;
}

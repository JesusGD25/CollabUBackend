import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { StudentProfile } from './student-profile.entity';

@Entity('education')
export class Education {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 200 })
  institution: string;

  @Column({ type: 'varchar', length: 150 })
  degree: string;

  @Column({ name: 'field_of_study', type: 'varchar', length: 150, nullable: true })
  fieldOfStudy: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'is_current', type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  gpa: number | null;

  @Column({ type: 'text', array: true, nullable: true })
  achievements: string[] | null;

  @Column({ name: 'thesis_title', type: 'varchar', length: 500, nullable: true })
  thesisTitle: string | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StudentProfile, (profile) => profile.education, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('academic_programs')
export class AcademicProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 20 })
  code: string;

  @Column({ default: 'Facultad de Ingeniería', length: 200 })
  faculty: string;

  @Column({ nullable: true, length: 200 })
  department: string;

  @Column({ name: 'total_semesters', default: 10 })
  totalSemesters: number;

  @Column({ name: 'requires_internship', default: true })
  requiresInternship: boolean;

  @Column({ name: 'minimum_semester_for_internship', default: 7 })
  minimumSemesterForInternship: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

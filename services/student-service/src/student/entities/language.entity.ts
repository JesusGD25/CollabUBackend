import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { StudentProfile } from './student-profile.entity';

export enum LanguageProficiency {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  NATIVE = 'native',
}

@Entity('languages')
@Unique('uq_language_student', ['studentId', 'language'])
export class Language {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 50 })
  language: string;

  @Column({
    type: 'enum',
    enum: LanguageProficiency,
    default: LanguageProficiency.BASIC,
  })
  proficiency: LanguageProficiency;

  @Column({ name: 'is_native', type: 'boolean', default: false })
  isNative: boolean;

  @Column({ name: 'certification_name', type: 'varchar', length: 200, nullable: true })
  certificationName: string | null;

  @Column({ name: 'certification_score', type: 'varchar', length: 50, nullable: true })
  certificationScore: string | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StudentProfile, (profile) => profile.languages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;
}

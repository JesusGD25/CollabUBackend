import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Skill } from './skill.entity';
import { Experience } from './experience.entity';
import { Education } from './education.entity';
import { Certification } from './certification.entity';
import { Language } from './language.entity';
import { Interest } from './interest.entity';

export enum StudentAvailability {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  FLEXIBLE = 'flexible',
  UNAVAILABLE = 'unavailable',
}

export enum PreferredWorkMode {
  REMOTE = 'remote',
  ON_SITE = 'on_site',
  HYBRID = 'hybrid',
}

@Entity('student_profiles')
@Index('idx_student_profiles_program_semester', ['program', 'semester'])
export class StudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ type: 'varchar', length: 150 })
  program: string;

  /**
   * FK lógica (cross-service) a admin_service.academic_programs.id — nullable durante la
   * transición desde `program` (texto libre). Se resuelve por backfill o al editar el perfil.
   * `program` se conserva por compatibilidad hasta que todos los consumidores migren.
   */
  @Column({ name: 'program_id', type: 'uuid', nullable: true })
  programId: string | null;

  @Column({ type: 'varchar', length: 150, default: 'Facultad de Ingeniería' })
  faculty: string;

  @Column({ type: 'integer' })
  semester: number;

  @Column({ name: 'student_code', type: 'varchar', length: 50, unique: true, nullable: true })
  studentCode: string | null;

  @Column({ name: 'enrollment_year', type: 'integer', nullable: true })
  enrollmentYear: number | null;

  @Column({ name: 'expected_graduation_year', type: 'integer', nullable: true })
  expectedGraduationYear: number | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  gpa: number | null;

  @Column({ name: 'total_credits_completed', type: 'integer', default: 0 })
  totalCreditsCompleted: number;

  @Column({ name: 'total_credits_required', type: 'integer', nullable: true })
  totalCreditsRequired: number | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  headline: string | null;

  @Column({ name: 'cv_url', type: 'varchar', length: 500, nullable: true })
  cvUrl: string | null;

  @Column({ name: 'portfolio_url', type: 'varchar', length: 500, nullable: true })
  portfolioUrl: string | null;

  @Column({ name: 'github_url', type: 'varchar', length: 500, nullable: true })
  githubUrl: string | null;

  @Column({ name: 'personal_website_url', type: 'varchar', length: 500, nullable: true })
  personalWebsiteUrl: string | null;

  @Column({
    type: 'enum',
    enum: StudentAvailability,
    default: StudentAvailability.FLEXIBLE,
  })
  availability: StudentAvailability;

  @Column({
    name: 'preferred_work_mode',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  preferredWorkMode: string | null;

  @Column({ name: 'available_hours_per_week', type: 'integer', nullable: true })
  availableHoursPerWeek: number | null;

  @Column({ name: 'willing_to_relocate', type: 'boolean', default: false })
  willingToRelocate: boolean;

  @Column({ name: 'has_completed_internship', type: 'boolean', default: false })
  hasCompletedInternship: boolean;

  @Column({ name: 'internship_count', type: 'integer', default: 0 })
  internshipCount: number;

  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  averageRating: number;

  @Column({ name: 'total_ratings', type: 'integer', default: 0 })
  totalRatings: number;

  @Column({ name: 'profile_completeness', type: 'integer', default: 0 })
  profileCompleteness: number;

  @Column({ name: 'is_visible', type: 'boolean', default: true })
  isVisible: boolean;

  @Column({ name: 'last_cv_generated_at', type: 'timestamptz', nullable: true })
  lastCvGeneratedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => Skill, (skill) => skill.student, { cascade: true, eager: false })
  skills: Skill[];

  @OneToMany(() => Experience, (experience) => experience.student, { cascade: true, eager: false })
  experiences: Experience[];

  @OneToMany(() => Education, (education) => education.student, { cascade: true, eager: false })
  education: Education[];

  @OneToMany(() => Certification, (certification) => certification.student, { cascade: true, eager: false })
  certifications: Certification[];

  @OneToMany(() => Language, (language) => language.student, { cascade: true, eager: false })
  languages: Language[];

  @OneToMany(() => Interest, (interest) => interest.student, { cascade: true, eager: false })
  interests: Interest[];
}

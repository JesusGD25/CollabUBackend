import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CompanyLocation } from './company-location.entity';
import { CompanyContact } from './company-contact.entity';
import { BusinessArea } from './business-area.entity';

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity('companies')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: string;

  @Column({ name: 'company_name', length: 200 })
  companyName: string;

  @Column({ name: 'legal_name', length: 200, nullable: true })
  legalName: string;

  @Column({ length: 50, unique: true, nullable: true })
  nit: string;

  @Column({ length: 100, nullable: true })
  @Index()
  industry: string;

  @Column({
    name: 'company_size',
    type: 'enum',
    enum: CompanySize,
    nullable: true,
  })
  companySize: CompanySize;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  website: string;

  @Column({ name: 'logo_url', length: 500, nullable: true })
  logoUrl: string;

  @Column({ name: 'founded_year', nullable: true })
  foundedYear: number;

  @Column({ name: 'headquarters_city', length: 100, nullable: true })
  headquartersCity: string;

  @Column({ name: 'headquarters_state', length: 100, nullable: true })
  headquartersState: string;

  @Column({ name: 'employee_count', nullable: true })
  employeeCount: number;

  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: VerificationStatus,
    default: VerificationStatus.PENDING,
  })
  @Index()
  verificationStatus: VerificationStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  @Index()
  rating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column({ name: 'total_projects', default: 0 })
  totalProjects: number;

  @Column({ name: 'profile_completeness', type: 'int', default: 0 })
  profileCompleteness: number;

  @Column({ name: 'is_active', default: true })
  @Index()
  isActive: boolean;

  /**
   * Departamentos (programas académicos de la Facultad) en cuya área trabaja la empresa.
   * Obligatorio (>= 1) para empresas nuevas; define qué administradores de departamento la ven y revisan.
   */
  @Column({ name: 'program_ids', type: 'uuid', array: true, default: () => "'{}'" })
  programIds: string[];

  /** Admin que tomó la última decisión de verificación (aprobar/rechazar/suspender). */
  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string | null;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => CompanyLocation, (location) => location.company)
  locations: CompanyLocation[];

  @OneToMany(() => CompanyContact, (contact) => contact.company)
  contacts: CompanyContact[];

  @OneToMany(() => BusinessArea, (area) => area.company)
  businessAreas: BusinessArea[];
}

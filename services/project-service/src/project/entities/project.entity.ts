import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import slugify from 'slugify';
import { ProjectRequirement } from './project-requirement.entity';
import { ProjectDeliverable } from './project-deliverable.entity';
import { ProjectTag } from './project-tag.entity';
import { ProjectActivity } from './project-activity.entity';

export enum ProjectType {
  INTERNSHIP = 'internship',
  PROFESSIONAL_PRACTICE = 'professional_practice',
  THESIS = 'thesis',
  RESEARCH = 'research',
  OTHER = 'other',
}

export enum ProjectStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum LocationType {
  REMOTE = 'remote',
  ONSITE = 'onsite',
  HYBRID = 'hybrid',
}

export enum CompensationType {
  PAID = 'paid',
  UNPAID = 'unpaid',
  ACADEMIC_CREDIT = 'academic_credit',
  STIPEND = 'stipend',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'created_by_user_id' })
  createdByUserId: string;

  @Column()
  title: string;

  @Column({ unique: true, nullable: true })
  slug: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'short_description', nullable: true })
  shortDescription: string;

  @Column({ name: 'project_type', type: 'enum', enum: ProjectType })
  projectType: ProjectType;

  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.DRAFT })
  status: ProjectStatus;

  @Column({ name: 'duration_months', nullable: true })
  durationMonths: number;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date;

  @Column({ name: 'location_type', type: 'enum', enum: LocationType, nullable: true })
  locationType: LocationType;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'compensation_type', type: 'enum', enum: CompensationType, nullable: true })
  compensationType: CompensationType;

  @Column({ name: 'compensation_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  compensationAmount: number;

  @Column({ default: 'COP' })
  currency: string;

  @Column({ name: 'positions_available', default: 1 })
  positionsAvailable: number;

  @Column({ name: 'positions_filled', default: 0 })
  positionsFilled: number;

  @Column({ name: 'application_deadline', type: 'date', nullable: true })
  applicationDeadline: Date;

  @Column({ name: 'academic_program', nullable: true })
  academicProgram: string;

  @Column({ name: 'minimum_semester', nullable: true })
  minimumSemester: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @Column({ name: 'applications_count', default: 0 })
  applicationsCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ProjectRequirement, (req) => req.project)
  requirements: ProjectRequirement[];

  @OneToMany(() => ProjectDeliverable, (del) => del.project)
  deliverables: ProjectDeliverable[];

  @OneToMany(() => ProjectTag, (tag) => tag.project)
  tags: ProjectTag[];

  @OneToMany(() => ProjectActivity, (activity) => activity.project)
  activities: ProjectActivity[];

  @BeforeInsert()
  generateSlug() {
    if (!this.slug && this.title) {
      this.slug =
        slugify(this.title, { lower: true, strict: true }) +
        '-' +
        Date.now().toString(36);
    }
  }
}

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

@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'issuing_organization', type: 'varchar', length: 200 })
  issuingOrganization: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate: Date | null;

  @Column({ name: 'is_permanent', type: 'boolean', default: false })
  isPermanent: boolean;

  @Column({ name: 'credential_id', type: 'varchar', length: 100, nullable: true })
  credentialId: string | null;

  @Column({ name: 'credential_url', type: 'varchar', length: 500, nullable: true })
  credentialUrl: string | null;

  @Column({ name: 'skills_associated', type: 'text', array: true, nullable: true })
  skillsAssociated: string[] | null;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => StudentProfile, (profile) => profile.certifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: StudentProfile;
}

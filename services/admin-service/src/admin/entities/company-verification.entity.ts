import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum VerificationAction {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
  REACTIVATED = 'reactivated',
}

@Entity('company_verifications')
export class CompanyVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @Column({ name: 'verified_by', type: 'uuid' })
  verifiedBy: string;

  @Column({ type: 'enum', enum: VerificationAction })
  action: VerificationAction;

  @Column({ name: 'previous_status', nullable: true, length: 50 })
  previousStatus: string;

  @Column({ name: 'new_status', nullable: true, length: 50 })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'documents_reviewed', type: 'jsonb', nullable: true })
  documentsReviewed: { docName: string; docUrl: string; verified: boolean }[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

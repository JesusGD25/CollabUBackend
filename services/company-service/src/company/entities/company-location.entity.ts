import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CompanyProfile } from './company-profile.entity';

@Entity('company_locations')
export class CompanyLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  @Index()
  companyId: string;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ length: 255, nullable: true })
  address: string;

  @Column({ length: 100 })
  @Index()
  city: string;

  @Column({ length: 100, nullable: true })
  state: string;

  @Column({ length: 100, default: 'Colombia' })
  country: string;

  @Column({ name: 'postal_code', length: 20, nullable: true })
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ name: 'is_headquarters', default: false })
  isHeadquarters: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => CompanyProfile, (company) => company.locations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'company_id' })
  company: CompanyProfile;
}

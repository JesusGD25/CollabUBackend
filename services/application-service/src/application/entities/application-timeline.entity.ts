import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Application } from './application.entity';
import { ApplicationStatus } from './enums';

@Entity('application_timeline')
@Index('idx_app_timeline_application', ['applicationId'])
export class ApplicationTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'application_id' })
  applicationId: string;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ApplicationStatus,
    nullable: true,
  })
  fromStatus: ApplicationStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: ApplicationStatus })
  toStatus: ApplicationStatus;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'changed_by_user_id' })
  changedByUserId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Application, (app) => app.timeline, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'application_id' })
  application: Application;
}

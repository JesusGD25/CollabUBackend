import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum AssignmentHistoryAction {
  CREATED = 'created',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REPLACED = 'replaced',
  DISCONNECTED = 'disconnected',
  COMPLETED = 'completed',
}

@Entity('supervisor_assignment_history')
export class SupervisorAssignmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @Column({ type: 'enum', enum: AssignmentHistoryAction })
  action: AssignmentHistoryAction;

  @Column({ name: 'previous_supervisor_id', type: 'uuid', nullable: true })
  previousSupervisorId: string | null;

  @Column({ name: 'new_supervisor_id', type: 'uuid', nullable: true })
  newSupervisorId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'performed_by', type: 'uuid' })
  performedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

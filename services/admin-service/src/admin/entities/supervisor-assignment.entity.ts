import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Supervisor } from './supervisor.entity';
import { AcademicPeriod } from './academic-period.entity';

/** Rol del docente dentro de un proyecto académico específico — un mismo docente
 *  puede ser asesor en un proyecto y jurado en otro (o incluso ambos roles en
 *  proyectos distintos), la distinción vive aquí, no en el usuario. */
export enum AssignmentRole {
  ASESOR = 'asesor',
  JURADO_ANTEPROYECTO = 'jurado_anteproyecto',
  JURADO_FINAL = 'jurado_final',
}

/**
 * pending_acceptance → solo asesor (jurado se auto-acepta, no puede rechazar)
 * accepted           → docente aceptó, esperando iniciar (o jurado auto-aceptado)
 * active              → proyecto en curso (tras aceptación del asesor)
 * declined            → asesor rechazó (con declineReason) — admin debe reasignar
 * disconnected        → jurado se desvinculó al completar su fase (ej. anteproyecto aprobado)
 * replaced            → asesor reemplazado por otro (ver SupervisorAssignmentHistory)
 * completed           → proyecto finalizado
 */
export enum AssignmentStatus {
  PENDING_ACCEPTANCE = 'pending_acceptance',
  ACCEPTED = 'accepted',
  ACTIVE = 'active',
  DECLINED = 'declined',
  DISCONNECTED = 'disconnected',
  REPLACED = 'replaced',
  COMPLETED = 'completed',
}

/**
 * Único por (studentId, projectId, role, supervisorId) — NO solo por role — para
 * permitir múltiples jurados de anteproyecto simultáneos (aprobación por
 * unanimidad, ver AcademicSubmission.pendingJuradoVotes). El asesor sigue siendo
 * lógicamente único por rol porque assignSupervisor rechaza una segunda asignación
 * de asesor mientras exista una activa (ver AdminService.assignSupervisor).
 */
@Entity('supervisor_assignments')
@Unique(['studentId', 'projectId', 'role', 'supervisorId'])
export class SupervisorAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supervisor_id', type: 'uuid' })
  supervisorId: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string;

  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @Column({ name: 'period_id', type: 'uuid' })
  periodId: string;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedBy: string;

  @Column({ type: 'enum', enum: AssignmentRole, default: AssignmentRole.ASESOR })
  role: AssignmentRole;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    default: AssignmentStatus.PENDING_ACCEPTANCE,
  })
  status: AssignmentStatus;

  @Column({ name: 'decline_reason', type: 'text', nullable: true })
  declineReason: string | null;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt: Date | null;

  @Column({ name: 'declined_at', type: 'timestamptz', nullable: true })
  declinedAt: Date | null;

  @Column({ name: 'disconnected_at', type: 'timestamptz', nullable: true })
  disconnectedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Supervisor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: Supervisor;

  @ManyToOne(() => AcademicPeriod, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'period_id' })
  period: AcademicPeriod;
}

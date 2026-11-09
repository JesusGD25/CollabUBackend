import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient, DepartmentScope, assertInScope } from '@collab-u/shared';

import { AcademicPeriod, PeriodStatus } from './entities/academic-period.entity';
import { Supervisor } from './entities/supervisor.entity';
import {
  SupervisorAssignment,
  AssignmentRole,
  AssignmentStatus,
} from './entities/supervisor-assignment.entity';
import {
  SupervisorAssignmentHistory,
  AssignmentHistoryAction,
} from './entities/supervisor-assignment-history.entity';
import { AssignSupervisorDto } from './dto/assign-supervisor.dto';
import { AssignJuradoDto } from './dto/assign-jurado.dto';
import { ReplaceAssignmentDto } from './dto/replace-assignment.dto';

/** Códigos estables para que la UI explique qué corregir (el mensaje es solo texto humano). */
export type AssignmentErrorCode =
  | 'PERIOD_NOT_FOUND'
  | 'PERIOD_NOT_ASSIGNABLE'
  | 'APPLICATION_UNAVAILABLE'
  | 'APPLICATION_MISMATCH'
  | 'APPLICATION_NOT_ASSIGNABLE'
  | 'SUPERVISOR_INACTIVE'
  | 'SUPERVISOR_FULL'
  | 'ASESOR_ALREADY_ASSIGNED'
  | 'JURADO_IS_ASESOR'
  | 'ASSIGNMENT_NOT_REPLACEABLE'
  | 'SAME_SUPERVISOR';

export function assignmentError(
  status: HttpStatus,
  code: AssignmentErrorCode,
  message: string,
): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}

export interface SkippedAssignment {
  supervisorId: string;
  role: AssignmentRole;
  reason: 'already_assigned';
}

export interface AssignmentResult {
  created: SupervisorAssignment[];
  skipped: SkippedAssignment[];
}

/** Estados en los que una asignación "cuenta" y bloquea una nueva del mismo docente/rol. */
const LIVE_STATUSES: AssignmentStatus[] = [
  AssignmentStatus.PENDING_ACCEPTANCE,
  AssignmentStatus.ACCEPTED,
  AssignmentStatus.ACTIVE,
  AssignmentStatus.COMPLETED,
];

/** Estados terminales de una asignación: la fila se puede REUTILIZAR (respeta el UNIQUE). */
const REUSABLE_STATUSES: AssignmentStatus[] = [
  AssignmentStatus.DECLINED,
  AssignmentStatus.REPLACED,
  AssignmentStatus.DISCONNECTED,
];

/** Estados de la postulación en los que todavía tiene sentido asignar jurado final. */
const FINAL_JURY_APPLICATION_STATUSES = ['pending_supervisor', 'accepted', 'in_progress'];

interface EnrichedApplication {
  id: string;
  studentId: string;
  projectId: string;
  programId?: string | null;
  status: string;
}

/** El DTO viaja con el departamento del estudiante para guardarlo como snapshot en la asignación. */
type WithProgram<T> = T & { programId?: string | null };

interface Change {
  /** fila creada en esta operación (se borra al compensar) */
  createdId?: string;
  /** fila reutilizada: estado previo para restaurarla al compensar */
  reused?: { id: string; previous: Partial<SupervisorAssignment> };
}

@Injectable()
export class AssignmentWorkflowService {
  private readonly logger = new Logger(AssignmentWorkflowService.name);

  constructor(
    @InjectRepository(AcademicPeriod) private readonly periodRepo: Repository<AcademicPeriod>,
    @InjectRepository(Supervisor) private readonly supervisorRepo: Repository<Supervisor>,
    @InjectRepository(SupervisorAssignment) private readonly assignmentRepo: Repository<SupervisorAssignment>,
    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Asesor (+ jurados de anteproyecto)
  // ───────────────────────────────────────────────────────────────────────────

  async assignSupervisor(adminId: string, dto: AssignSupervisorDto, scope: DepartmentScope | null = null): Promise<AssignmentResult> {
    // 1) VALIDACIÓN PREVIA — nada se escribe hasta que todo es válido.
    await this.assertPeriodAssignable(dto.periodId);
    const application = await this.fetchApplication(dto.applicationId);
    assertInScope(scope, application.programId, 'La postulación indicada no existe.');
    this.assertApplicationMatches(application, dto.studentId, dto.projectId);
    (dto as WithProgram<AssignSupervisorDto>).programId = application.programId ?? null;

    const liveAsesor = await this.findLiveAsesor(dto.studentId, dto.projectId);
    if (liveAsesor && liveAsesor.supervisorId !== dto.supervisorId) {
      throw assignmentError(
        HttpStatus.CONFLICT,
        'ASESOR_ALREADY_ASSIGNED',
        'El estudiante ya tiene otro asesor asignado para este proyecto. Usa "Reemplazar" para cambiarlo.',
      );
    }
    // Reintento idempotente: el mismo asesor ya está asignado → no se vuelve a crear.
    const createAsesor = !liveAsesor;

    let asesor: Supervisor | null = null;
    if (createAsesor) {
      if (application.status !== 'accepted') {
        throw assignmentError(
          HttpStatus.BAD_REQUEST,
          'APPLICATION_NOT_ASSIGNABLE',
          `La postulación está en estado "${application.status}"; solo se asigna asesor a postulaciones aceptadas.`,
        );
      }
      asesor = await this.loadActiveSupervisor(dto.supervisorId);
    }

    const juradoIds = [...new Set(dto.juradoIds ?? [])];
    if (juradoIds.includes(dto.supervisorId)) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'JURADO_IS_ASESOR',
        'El asesor no puede ser también jurado del mismo proyecto.',
      );
    }
    const jurados: Supervisor[] = [];
    for (const juradoId of juradoIds) jurados.push(await this.loadActiveSupervisor(juradoId));

    // 2) ESCRITURA ATÓMICA — o se guarda todo (asesor + jurados + historial + contador) o nada.
    const changes: Change[] = [];
    const skipped: SkippedAssignment[] = [];
    const created = await this.dataSource.transaction(async (em) => {
        const rows: SupervisorAssignment[] = [];

        if (createAsesor && asesor) {
          await this.reserveCapacity(em, asesor.id);
          rows.push(
            await this.upsertAssignment(em, changes, {
              supervisorId: asesor.id,
              role: AssignmentRole.ASESOR,
              status: AssignmentStatus.PENDING_ACCEPTANCE,
              adminId,
              dto,
              notes: dto.notes,
            }),
          );
        } else if (liveAsesor) {
          skipped.push({ supervisorId: liveAsesor.supervisorId, role: AssignmentRole.ASESOR, reason: 'already_assigned' });
        }

        for (const jurado of jurados) {
          const outcome = await this.upsertJuradoIfNeeded(em, changes, jurado.id, AssignmentRole.JURADO_ANTEPROYECTO, adminId, dto);
          if (outcome) rows.push(outcome);
          else skipped.push({ supervisorId: jurado.id, role: AssignmentRole.JURADO_ANTEPROYECTO, reason: 'already_assigned' });
        }
        return rows;
    });

    // 3) EFECTOS EXTERNOS — después del commit. Si la postulación no se puede marcar, se compensa.
    if (createAsesor) {
      await this.markPendingSupervisorOrCompensate(dto.applicationId, changes, asesor!.id);
    }

    for (const row of created) {
      const sup = row.role === AssignmentRole.ASESOR ? asesor : jurados.find((j) => j.id === row.supervisorId);
      await this.publishAssigned(row, sup?.userId);
    }

    return { created, skipped };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Jurado final
  // ───────────────────────────────────────────────────────────────────────────

  async assignJurado(adminId: string, dto: AssignJuradoDto, scope: DepartmentScope | null = null): Promise<AssignmentResult> {
    await this.assertPeriodAssignable(dto.periodId);
    const application = await this.fetchApplication(dto.applicationId);
    assertInScope(scope, application.programId, 'La postulación indicada no existe.');
    this.assertApplicationMatches(application, dto.studentId, dto.projectId);
    (dto as WithProgram<AssignJuradoDto>).programId = application.programId ?? null;
    if (!FINAL_JURY_APPLICATION_STATUSES.includes(application.status)) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'APPLICATION_NOT_ASSIGNABLE',
        `La postulación está en estado "${application.status}"; el jurado final se asigna durante el proceso académico.`,
      );
    }

    const liveAsesor = await this.findLiveAsesor(dto.studentId, dto.projectId);
    const juradoIds = [...new Set(dto.juradoIds)];
    const jurados: Supervisor[] = [];
    for (const juradoId of juradoIds) {
      if (liveAsesor && liveAsesor.supervisorId === juradoId) {
        throw assignmentError(
          HttpStatus.BAD_REQUEST,
          'JURADO_IS_ASESOR',
          'El asesor del proyecto no puede ser también jurado.',
        );
      }
      jurados.push(await this.loadActiveSupervisor(juradoId));
    }

    const changes: Change[] = [];
    const skipped: SkippedAssignment[] = [];
    const created = await this.dataSource.transaction(async (em) => {
      const rows: SupervisorAssignment[] = [];
      for (const jurado of jurados) {
        const outcome = await this.upsertJuradoIfNeeded(em, changes, jurado.id, dto.role, adminId, dto);
        if (outcome) rows.push(outcome);
        else skipped.push({ supervisorId: jurado.id, role: dto.role, reason: 'already_assigned' });
      }
      return rows;
    });

    for (const row of created) {
      await this.publishAssigned(row, jurados.find((j) => j.id === row.supervisorId)?.userId);
    }
    return { created, skipped };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Reemplazo de asesor
  // ───────────────────────────────────────────────────────────────────────────

  async replaceAssignment(assignmentId: string, adminId: string, dto: ReplaceAssignmentDto, scope: DepartmentScope | null = null): Promise<SupervisorAssignment> {
    const old = await this.assignmentRepo.findOne({ where: { id: assignmentId } });
    if (!old) throw new NotFoundException('Asignación no encontrada');
    assertInScope(scope, old.programId, 'Asignación no encontrada');
    if (old.role !== AssignmentRole.ASESOR) {
      throw assignmentError(HttpStatus.BAD_REQUEST, 'ASSIGNMENT_NOT_REPLACEABLE', 'Solo se puede reemplazar la asignación del asesor.');
    }
    if (old.status !== AssignmentStatus.PENDING_ACCEPTANCE && old.status !== AssignmentStatus.ACCEPTED) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'ASSIGNMENT_NOT_REPLACEABLE',
        `No se puede reemplazar una asignación en estado "${old.status}".`,
      );
    }
    if (old.supervisorId === dto.newSupervisorId) {
      throw assignmentError(HttpStatus.BAD_REQUEST, 'SAME_SUPERVISOR', 'El nuevo asesor es el mismo docente actual.');
    }

    const newSupervisor = await this.loadActiveSupervisor(dto.newSupervisorId);
    const previousSupervisor = await this.supervisorRepo.findOne({ where: { id: old.supervisorId } });

    const liveJurado = await this.assignmentRepo.findOne({
      where: {
        studentId: old.studentId,
        projectId: old.projectId,
        supervisorId: newSupervisor.id,
        role: In([AssignmentRole.JURADO_ANTEPROYECTO, AssignmentRole.JURADO_FINAL]),
        status: In(LIVE_STATUSES),
      },
    });
    if (liveJurado) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'JURADO_IS_ASESOR',
        'El nuevo asesor ya es jurado de este proyecto; elige otro docente.',
      );
    }

    const changes: Change[] = [];
    const saved = await this.dataSource.transaction(async (em) => {
      await this.reserveCapacity(em, newSupervisor.id);

      await em.update(SupervisorAssignment, { id: old.id }, { status: AssignmentStatus.REPLACED });
      await em
        .createQueryBuilder()
        .update(Supervisor)
        .set({ currentStudents: () => 'GREATEST("current_students" - 1, 0)' })
        .where('id = :id', { id: old.supervisorId })
        .execute();

      const replacement = await this.upsertAssignment(em, changes, {
        supervisorId: newSupervisor.id,
        role: AssignmentRole.ASESOR,
        status: AssignmentStatus.PENDING_ACCEPTANCE,
        adminId,
        dto: {
          studentId: old.studentId,
          projectId: old.projectId,
          applicationId: old.applicationId,
          periodId: old.periodId,
          programId: old.programId,
          startDate: old.startDate,
          endDate: old.endDate ?? undefined,
        },
        notes: dto.reason,
      });

      await em.save(
        em.create(SupervisorAssignmentHistory, {
          assignmentId: old.id,
          action: AssignmentHistoryAction.REPLACED,
          performedBy: adminId,
          previousSupervisorId: old.supervisorId,
          newSupervisorId: newSupervisor.id,
          reason: dto.reason,
        }),
      );
      return replacement;
    });

    await this.eventPublisher.publish(
      'admin.supervisor.replaced',
      {
        oldAssignmentId: old.id,
        newAssignmentId: saved.id,
        previousSupervisorId: old.supervisorId,
        previousSupervisorUserId: previousSupervisor?.userId,
        newSupervisorId: newSupervisor.id,
        newSupervisorUserId: newSupervisor.userId,
        studentId: old.studentId,
        projectId: old.projectId,
        applicationId: old.applicationId,
        reason: dto.reason,
      },
      'admin-service',
    );
    return saved;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Validaciones
  // ───────────────────────────────────────────────────────────────────────────

  private async assertPeriodAssignable(periodId: string): Promise<void> {
    const period = await this.periodRepo.findOne({ where: { id: periodId } });
    if (!period) {
      throw assignmentError(HttpStatus.NOT_FOUND, 'PERIOD_NOT_FOUND', 'El período académico indicado no existe.');
    }
    if (period.status === PeriodStatus.CLOSED || period.status === PeriodStatus.ARCHIVED) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'PERIOD_NOT_ASSIGNABLE',
        `El período "${period.name}" está ${period.status === PeriodStatus.CLOSED ? 'cerrado' : 'archivado'}; elige un período vigente.`,
      );
    }
  }

  private async fetchApplication(applicationId: string): Promise<EnrichedApplication> {
    try {
      return await this.httpClient.get<EnrichedApplication>('application', `/internal/applications/${applicationId}/enriched`);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        throw assignmentError(HttpStatus.NOT_FOUND, 'APPLICATION_MISMATCH', 'La postulación indicada no existe.');
      }
      this.logger.warn(`No se pudo verificar la postulación ${applicationId}: ${(err as Error).message}`);
      throw assignmentError(
        HttpStatus.SERVICE_UNAVAILABLE,
        'APPLICATION_UNAVAILABLE',
        'No se pudo verificar la postulación en este momento. Intenta de nuevo en unos segundos; no se guardó ningún cambio.',
      );
    }
  }

  private assertApplicationMatches(app: EnrichedApplication, studentId: string, projectId: string): void {
    if (app.studentId !== studentId || app.projectId !== projectId) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'APPLICATION_MISMATCH',
        'La postulación no corresponde al estudiante y proyecto indicados.',
      );
    }
  }

  private async loadActiveSupervisor(id: string): Promise<Supervisor> {
    const supervisor = await this.supervisorRepo.findOne({ where: { id } });
    if (!supervisor) throw new NotFoundException('Supervisor no encontrado');
    if (!supervisor.isActive) {
      throw assignmentError(HttpStatus.BAD_REQUEST, 'SUPERVISOR_INACTIVE', 'El docente seleccionado no está activo.');
    }
    return supervisor;
  }

  private findLiveAsesor(studentId: string, projectId: string): Promise<SupervisorAssignment | null> {
    return this.assignmentRepo.findOne({
      where: { studentId, projectId, role: AssignmentRole.ASESOR, status: In(LIVE_STATUSES) },
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Escritura (dentro de la transacción)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Reserva un cupo de forma atómica: bloquea la fila del docente, revisa el cupo y suma 1.
   * Dos asignaciones simultáneas al último cupo ya no pasan ambas.
   */
  private async reserveCapacity(em: EntityManager, supervisorId: string): Promise<void> {
    const supervisor = await em.findOne(Supervisor, { where: { id: supervisorId }, lock: { mode: 'pessimistic_write' } });
    if (!supervisor) throw new NotFoundException('Supervisor no encontrado');
    if (supervisor.currentStudents >= supervisor.maxStudents) {
      throw assignmentError(
        HttpStatus.BAD_REQUEST,
        'SUPERVISOR_FULL',
        'El docente alcanzó su límite de estudiantes. Elige otro o aumenta su cupo.',
      );
    }
    supervisor.currentStudents += 1;
    await em.save(supervisor);
  }

  /** Crea la asignación, o REUTILIZA la fila terminal del mismo (estudiante, proyecto, rol, docente). */
  private async upsertAssignment(
    em: EntityManager,
    changes: Change[],
    input: {
      supervisorId: string;
      role: AssignmentRole;
      status: AssignmentStatus;
      adminId: string;
      dto: WithProgram<Pick<AssignSupervisorDto, 'studentId' | 'projectId' | 'applicationId' | 'periodId' | 'startDate' | 'endDate'>>;
      notes?: string;
    },
  ): Promise<SupervisorAssignment> {
    const { dto } = input;
    const existing = await em.findOne(SupervisorAssignment, {
      where: { studentId: dto.studentId, projectId: dto.projectId, role: input.role, supervisorId: input.supervisorId },
    });
    const autoAccepted = input.status === AssignmentStatus.ACCEPTED;

    let row: SupervisorAssignment;
    if (existing) {
      // El UNIQUE(student, project, role, supervisor) impide insertar otra fila: se reactiva la anterior.
      changes.push({
        reused: {
          id: existing.id,
          previous: {
            status: existing.status,
            declinedAt: existing.declinedAt,
            declineReason: existing.declineReason,
            acceptedAt: existing.acceptedAt,
            disconnectedAt: existing.disconnectedAt,
            periodId: existing.periodId,
            applicationId: existing.applicationId,
            assignedBy: existing.assignedBy,
          },
        },
      });
      existing.status = input.status;
      existing.declinedAt = null as unknown as Date;
      existing.declineReason = null as unknown as string;
      existing.disconnectedAt = null as unknown as Date;
      existing.acceptedAt = (autoAccepted ? new Date() : null) as unknown as Date;
      existing.periodId = dto.periodId;
      existing.applicationId = dto.applicationId;
      existing.assignedBy = input.adminId;
      row = await em.save(existing);
    } else {
      row = await em.save(
        em.create(SupervisorAssignment, {
          supervisorId: input.supervisorId,
          studentId: dto.studentId,
          projectId: dto.projectId,
          applicationId: dto.applicationId,
          programId: dto.programId ?? null,
          periodId: dto.periodId,
          startDate: dto.startDate,
          endDate: dto.endDate,
          notes: input.notes,
          assignedBy: input.adminId,
          role: input.role,
          status: input.status,
          ...(autoAccepted ? { acceptedAt: new Date() } : {}),
        }),
      );
      changes.push({ createdId: row.id });
    }

    await em.save(
      em.create(SupervisorAssignmentHistory, {
        assignmentId: row.id,
        action: AssignmentHistoryAction.CREATED,
        performedBy: input.adminId,
        previousSupervisorId: null,
        newSupervisorId: input.supervisorId,
        reason: existing ? `Reasignación (estado previo: ${changes.at(-1)?.reused?.previous.status})` : null,
      }),
    );
    return row;
  }

  /** Jurado: se auto-acepta. Devuelve null si ya tiene una asignación vigente (se omite, no se duplica). */
  private async upsertJuradoIfNeeded(
    em: EntityManager,
    changes: Change[],
    supervisorId: string,
    role: AssignmentRole,
    adminId: string,
    dto: WithProgram<Pick<AssignSupervisorDto, 'studentId' | 'projectId' | 'applicationId' | 'periodId' | 'startDate' | 'endDate'>>,
  ): Promise<SupervisorAssignment | null> {
    const existing = await em.findOne(SupervisorAssignment, {
      where: { studentId: dto.studentId, projectId: dto.projectId, role, supervisorId },
    });
    if (existing && LIVE_STATUSES.includes(existing.status)) return null;
    if (existing && !REUSABLE_STATUSES.includes(existing.status)) return null;

    return this.upsertAssignment(em, changes, {
      supervisorId,
      role,
      status: AssignmentStatus.ACCEPTED,
      adminId,
      dto,
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Efectos externos y compensación
  // ───────────────────────────────────────────────────────────────────────────

  private async markPendingSupervisorOrCompensate(applicationId: string, changes: Change[], asesorId: string): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.httpClient.patch('application', `/internal/applications/${applicationId}/pending-supervisor`, {});
        return;
      } catch (err) {
        lastError = err;
        this.logger.warn(`pending-supervisor intento ${attempt}/3 falló para ${applicationId}: ${(err as Error).message}`);
      }
    }

    // La postulación no se pudo marcar: se deshace la asignación para no dejar los servicios incoherentes.
    await this.compensate(changes, asesorId);
    this.logger.error(`Asignación revertida: ${applicationId} (${(lastError as Error)?.message})`);
    throw assignmentError(
      HttpStatus.SERVICE_UNAVAILABLE,
      'APPLICATION_UNAVAILABLE',
      'No se pudo actualizar la postulación; la asignación se deshizo y no se guardó ningún cambio. Intenta de nuevo.',
    );
  }

  private async compensate(changes: Change[], asesorId: string): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      for (const change of changes) {
        if (change.createdId) {
          await em.delete(SupervisorAssignmentHistory, { assignmentId: change.createdId });
          await em.delete(SupervisorAssignment, { id: change.createdId });
        } else if (change.reused) {
          await em.update(SupervisorAssignment, { id: change.reused.id }, change.reused.previous);
        }
      }
      await em
        .createQueryBuilder()
        .update(Supervisor)
        .set({ currentStudents: () => 'GREATEST("current_students" - 1, 0)' })
        .where('id = :id', { id: asesorId })
        .execute();
    });
  }

  private async publishAssigned(row: SupervisorAssignment, supervisorUserId?: string): Promise<void> {
    try {
      await this.eventPublisher.publish(
        'admin.supervisor.assigned',
        {
          assignmentId: row.id,
          supervisorId: row.supervisorId,
          supervisorUserId,
          studentId: row.studentId,
          projectId: row.projectId,
          applicationId: row.applicationId,
          role: row.role,
          assignedBy: row.assignedBy,
        },
        'admin-service',
      );
    } catch (err) {
      // La asignación ya está guardada; un fallo de mensajería no debe revertirla ni devolver error.
      this.logger.warn(`No se pudo publicar admin.supervisor.assigned (${row.id}): ${(err as Error).message}`);
    }
  }
}

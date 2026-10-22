import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { AssignmentWorkflowService } from './assignment-workflow.service';
import { AcademicPeriod, PeriodStatus } from './entities/academic-period.entity';
import { Supervisor } from './entities/supervisor.entity';
import { SupervisorAssignment, AssignmentRole, AssignmentStatus } from './entities/supervisor-assignment.entity';
import { SupervisorAssignmentHistory } from './entities/supervisor-assignment-history.entity';

const STUDENT = 'stu-1';
const PROJECT = 'proj-1';
const APP = 'app-1';
const PERIOD = 'per-1';

const supervisor = (id: string, extra: Partial<Supervisor> = {}) =>
  ({ id, userId: `user-${id}`, isActive: true, currentStudents: 2, maxStudents: 10, ...extra }) as Supervisor;

const baseDto = (extra: Record<string, unknown> = {}) =>
  ({
    supervisorId: 'asesor-1',
    juradoIds: [],
    studentId: STUDENT,
    projectId: PROJECT,
    applicationId: APP,
    periodId: PERIOD,
    startDate: '2026-10-01',
    ...extra,
  }) as any;

/** Código de error estable de una HttpException del servicio. */
const codeOf = (err: unknown): string | undefined => (err as HttpException).getResponse?.() && ((err as HttpException).getResponse() as any).code;

describe('AssignmentWorkflowService', () => {
  let service: AssignmentWorkflowService;

  let periodRepo: { findOne: jest.Mock };
  let supervisorRepo: { findOne: jest.Mock };
  let assignmentRepo: { findOne: jest.Mock };
  let em: any;
  let dataSource: { transaction: jest.Mock };
  let events: { publish: jest.Mock };
  let http: { get: jest.Mock; patch: jest.Mock };

  /** Estado simulado de la "base de datos" dentro de la transacción. */
  let supervisors: Record<string, Supervisor>;
  let assignmentsByKey: Record<string, SupervisorAssignment>;
  let saved: SupervisorAssignment[];
  let deleted: string[];
  let updated: Array<{ id: string; patch: any }>;
  let histories: any[];
  let counterDecrements: string[];

  const key = (r: Partial<SupervisorAssignment>) => `${r.studentId}|${r.projectId}|${r.role}|${r.supervisorId}`;

  beforeEach(async () => {
    supervisors = {
      'asesor-1': supervisor('asesor-1'),
      'asesor-2': supervisor('asesor-2'),
      'jurado-1': supervisor('jurado-1'),
      'jurado-2': supervisor('jurado-2'),
    };
    assignmentsByKey = {};
    saved = [];
    deleted = [];
    updated = [];
    histories = [];
    counterDecrements = [];

    periodRepo = { findOne: jest.fn().mockResolvedValue({ id: PERIOD, name: '2026-2', status: PeriodStatus.ACTIVE }) };
    supervisorRepo = { findOne: jest.fn(({ where }) => Promise.resolve(supervisors[where.id] ?? null)) };
    assignmentRepo = { findOne: jest.fn().mockResolvedValue(null) };

    em = {
      findOne: jest.fn((entity: any, opts: any) => {
        if (entity === Supervisor) return Promise.resolve(supervisors[opts.where.id] ?? null);
        if (entity === SupervisorAssignment) return Promise.resolve(assignmentsByKey[key(opts.where)] ?? null);
        return Promise.resolve(null);
      }),
      create: jest.fn((entity: any, data: any) => (entity === SupervisorAssignmentHistory ? { ...data, __history: true } : { id: `asgn-${saved.length + 1}`, ...data })),
      save: jest.fn((row: any) => {
        if (row.__history) {
          histories.push(row);
          return Promise.resolve(row);
        }
        if (row.supervisorId && row.role) {
          assignmentsByKey[key(row)] = row;
          saved.push(row);
        }
        return Promise.resolve(row);
      }),
      update: jest.fn((_e: any, where: any, patch: any) => {
        updated.push({ id: where.id, patch });
        return Promise.resolve();
      }),
      delete: jest.fn((_e: any, where: any) => {
        deleted.push(where.id ?? where.assignmentId);
        return Promise.resolve();
      }),
      createQueryBuilder: jest.fn(() => {
        const qb: any = {
          update: () => qb,
          set: () => qb,
          where: (_c: string, params: any) => {
            counterDecrements.push(params.id);
            return qb;
          },
          execute: () => Promise.resolve(),
        };
        return qb;
      }),
    };
    dataSource = { transaction: jest.fn((cb: any) => cb(em)) };
    events = { publish: jest.fn().mockResolvedValue(undefined) };
    http = {
      get: jest.fn().mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'accepted' }),
      patch: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssignmentWorkflowService,
        { provide: getRepositoryToken(AcademicPeriod), useValue: periodRepo },
        { provide: getRepositoryToken(Supervisor), useValue: supervisorRepo },
        { provide: getRepositoryToken(SupervisorAssignment), useValue: assignmentRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: EventPublisher, useValue: events },
        { provide: MicroserviceHttpClient, useValue: http },
      ],
    }).compile();
    service = module.get(AssignmentWorkflowService);
  });

  // ───────────────────────── assignSupervisor ─────────────────────────

  describe('assignSupervisor — camino feliz', () => {
    it('crea asesor (pending_acceptance) + jurados (accepted), reserva cupo y marca pending_supervisor', async () => {
      const res = await service.assignSupervisor('admin-1', baseDto({ juradoIds: ['jurado-1', 'jurado-2'] }));

      expect(res.created.map((r) => `${r.role}:${r.supervisorId}:${r.status}`)).toEqual([
        'asesor:asesor-1:pending_acceptance',
        'jurado_anteproyecto:jurado-1:accepted',
        'jurado_anteproyecto:jurado-2:accepted',
      ]);
      expect(res.skipped).toEqual([]);
      expect(supervisors['asesor-1'].currentStudents).toBe(3); // 2 + 1
      expect(histories).toHaveLength(3);
      expect(http.patch).toHaveBeenCalledWith('application', `/internal/applications/${APP}/pending-supervisor`, {});
      expect(events.publish).toHaveBeenCalledTimes(3);
      expect(dataSource.transaction).toHaveBeenCalledTimes(1); // una sola transacción
    });
  });

  describe('alcance por departamento', () => {
    it('un admin de OTRO departamento no puede asignar (404) y no se escribe nada', async () => {
      http.get.mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'accepted', programId: 'dept-ele' });

      await expect(
        service.assignSupervisor('admin-1', baseDto({}), { all: false, departmentId: 'dept-sis' }),
      ).rejects.toMatchObject({ status: 404 });

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(saved).toHaveLength(0);
    });

    it('el admin del departamento del estudiante sí asigna y la asignación guarda el programId', async () => {
      http.get.mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'accepted', programId: 'dept-sis' });

      const res = await service.assignSupervisor('admin-1', baseDto({}), { all: false, departmentId: 'dept-sis' });

      expect(res.created[0]).toMatchObject({ programId: 'dept-sis' });
    });
  });

  describe('A1 — validación previa y atomicidad', () => {
    it('un jurado inactivo se detecta ANTES de crear nada (no deja al asesor creado)', async () => {
      supervisors['jurado-1'].isActive = false;

      await expect(service.assignSupervisor('admin-1', baseDto({ juradoIds: ['jurado-1'] }))).rejects.toMatchObject({});

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(saved).toHaveLength(0);
      expect(http.patch).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
      expect(supervisors['asesor-1'].currentStudents).toBe(2); // contador intacto
    });

    it('si falla la escritura (cupo agotado en la carrera), nada se publica ni se marca', async () => {
      supervisors['asesor-1'].currentStudents = 10; // lleno al reservar
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('SUPERVISOR_FULL');
      expect(http.patch).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('un jurado igual al asesor se rechaza antes de escribir', async () => {
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto({ juradoIds: ['asesor-1'] }));
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('JURADO_IS_ASESOR');
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('jurados repetidos en la petición se deduplican', async () => {
      const res = await service.assignSupervisor('admin-1', baseDto({ juradoIds: ['jurado-1', 'jurado-1'] }));
      expect(res.created.filter((r) => r.role === AssignmentRole.JURADO_ANTEPROYECTO)).toHaveLength(1);
    });
  });

  describe('A2 — reasignar tras estados terminales', () => {
    const rowOf = (status: AssignmentStatus, supervisorId = 'asesor-1') =>
      ({
        id: 'old-1',
        studentId: STUDENT,
        projectId: PROJECT,
        role: AssignmentRole.ASESOR,
        supervisorId,
        status,
        declinedAt: new Date(),
        declineReason: 'no tengo cupo de tiempo',
      }) as unknown as SupervisorAssignment;

    it.each([AssignmentStatus.DECLINED, AssignmentStatus.REPLACED, AssignmentStatus.DISCONNECTED])(
      'permite asignar de nuevo cuando la asignación previa está %s (reutiliza la fila, sin violar el UNIQUE)',
      async (status) => {
        const previous = rowOf(status);
        assignmentsByKey[key(previous)] = previous;

        const res = await service.assignSupervisor('admin-1', baseDto());

        expect(res.created).toHaveLength(1);
        expect(res.created[0].id).toBe('old-1'); // misma fila, no una nueva
        expect(res.created[0].status).toBe(AssignmentStatus.PENDING_ACCEPTANCE);
        expect(res.created[0].declineReason).toBeNull();
      },
    );

    it('un asesor vigente DISTINTO sigue bloqueando (409) y no se escribe nada', async () => {
      assignmentRepo.findOne.mockResolvedValue(rowOf(AssignmentStatus.ACCEPTED, 'asesor-2'));

      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('ASESOR_ALREADY_ASSIGNED');
      expect((err as HttpException).getStatus()).toBe(409);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('A6 — idempotencia (doble clic / reintento)', () => {
    it('el MISMO asesor ya vigente no se duplica ni falla: queda en skipped', async () => {
      assignmentRepo.findOne.mockResolvedValue({
        id: 'live',
        studentId: STUDENT,
        projectId: PROJECT,
        role: AssignmentRole.ASESOR,
        supervisorId: 'asesor-1',
        status: AssignmentStatus.PENDING_ACCEPTANCE,
      });
      // tras la primera ejecución la postulación ya está en pending_supervisor
      http.get.mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'pending_supervisor' });

      const res = await service.assignSupervisor('admin-1', baseDto({ juradoIds: ['jurado-1'] }));

      expect(res.skipped).toEqual([{ supervisorId: 'asesor-1', role: 'asesor', reason: 'already_assigned' }]);
      expect(res.created.map((r) => r.supervisorId)).toEqual(['jurado-1']); // sí completa lo que faltaba
      expect(supervisors['asesor-1'].currentStudents).toBe(2); // no suma otro cupo
      expect(http.patch).not.toHaveBeenCalled();
    });

    it('un jurado que ya está vigente se omite (skipped) en vez de ignorarse en silencio', async () => {
      const live = { id: 'j-live', studentId: STUDENT, projectId: PROJECT, role: AssignmentRole.JURADO_ANTEPROYECTO, supervisorId: 'jurado-1', status: AssignmentStatus.ACCEPTED } as SupervisorAssignment;
      assignmentsByKey[key(live)] = live;

      const res = await service.assignSupervisor('admin-1', baseDto({ juradoIds: ['jurado-1', 'jurado-2'] }));

      expect(res.skipped).toEqual([{ supervisorId: 'jurado-1', role: 'jurado_anteproyecto', reason: 'already_assigned' }]);
      expect(res.created.map((r) => r.supervisorId)).toContain('jurado-2');
    });
  });

  describe('A5 — coherencia estudiante / proyecto / postulación / período', () => {
    it('la postulación de otro estudiante se rechaza', async () => {
      http.get.mockResolvedValue({ id: APP, studentId: 'otro-estudiante', projectId: PROJECT, status: 'accepted' });
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('APPLICATION_MISMATCH');
    });

    it('una postulación que no está "accepted" no admite asesor', async () => {
      http.get.mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'interview' });
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('APPLICATION_NOT_ASSIGNABLE');
    });

    it('período inexistente → 404, período cerrado → 400', async () => {
      periodRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.assignSupervisor('admin-1', baseDto())).rejects.toMatchObject({ status: 404 });

      periodRepo.findOne.mockResolvedValueOnce({ id: PERIOD, name: '2026-1', status: PeriodStatus.CLOSED });
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('PERIOD_NOT_ASSIGNABLE');
    });

    it('si application-service no responde → 503 y no se escribe nada (no asigna a ciegas)', async () => {
      http.get.mockRejectedValue(new Error('ECONNREFUSED'));
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('APPLICATION_UNAVAILABLE');
      expect((err as HttpException).getStatus()).toBe(503);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('docente inexistente → 404; inactivo → SUPERVISOR_INACTIVE', async () => {
      await expect(service.assignSupervisor('admin-1', baseDto({ supervisorId: 'no-existe' }))).rejects.toBeInstanceOf(NotFoundException);

      supervisors['asesor-1'].isActive = false;
      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('SUPERVISOR_INACTIVE');
    });
  });

  describe('A7 — la postulación no se puede marcar: se compensa', () => {
    it('reintenta 3 veces y, si falla, DESHACE la asignación (fila borrada + cupo devuelto) y devuelve 503', async () => {
      http.patch.mockRejectedValue(new Error('application-service caído'));

      let err: unknown;
      try {
        await service.assignSupervisor('admin-1', baseDto({ juradoIds: ['jurado-1'] }));
      } catch (e) {
        err = e;
      }

      expect(http.patch).toHaveBeenCalledTimes(3);
      expect(codeOf(err)).toBe('APPLICATION_UNAVAILABLE');
      // compensación: se borran las 2 filas creadas (asesor + jurado) y se devuelve el cupo del asesor
      expect(deleted.length).toBeGreaterThanOrEqual(2);
      expect(counterDecrements).toEqual(['asesor-1']);
      expect(events.publish).not.toHaveBeenCalled(); // nunca se anunció una asignación que se deshizo
    });

    it('si fallan solo 2 intentos y el 3º responde, la asignación se conserva', async () => {
      http.patch.mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined);

      const res = await service.assignSupervisor('admin-1', baseDto());

      expect(res.created).toHaveLength(1);
      expect(deleted).toHaveLength(0);
    });

    it('al compensar una fila REUTILIZADA se restaura su estado previo (no se borra)', async () => {
      const previous = { id: 'old-1', studentId: STUDENT, projectId: PROJECT, role: AssignmentRole.ASESOR, supervisorId: 'asesor-1', status: AssignmentStatus.DECLINED } as SupervisorAssignment;
      assignmentsByKey[key(previous)] = previous;
      http.patch.mockRejectedValue(new Error('caído'));

      await expect(service.assignSupervisor('admin-1', baseDto())).rejects.toBeDefined();

      expect(deleted).not.toContain('old-1');
      expect(updated.find((u) => u.id === 'old-1')?.patch.status).toBe(AssignmentStatus.DECLINED);
    });
  });

  it('un fallo al publicar el evento NO revierte ni falla la asignación ya guardada', async () => {
    events.publish.mockRejectedValue(new Error('rabbit caído'));
    const res = await service.assignSupervisor('admin-1', baseDto());
    expect(res.created).toHaveLength(1);
  });

  // ───────────────────────── assignJurado ─────────────────────────

  describe('assignJurado (jurado final)', () => {
    const juradoDto = (extra: Record<string, unknown> = {}) => baseDto({ role: AssignmentRole.JURADO_FINAL, juradoIds: ['jurado-1'], supervisorId: undefined, ...extra });

    beforeEach(() => {
      http.get.mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'in_progress' });
    });

    it('A3 — agrega un SEGUNDO jurado aunque ya exista uno (antes se ignoraba en silencio)', async () => {
      const first = { id: 'jf-1', studentId: STUDENT, projectId: PROJECT, role: AssignmentRole.JURADO_FINAL, supervisorId: 'jurado-1', status: AssignmentStatus.ACCEPTED } as SupervisorAssignment;
      assignmentsByKey[key(first)] = first;

      const res = await service.assignJurado('admin-1', juradoDto({ juradoIds: ['jurado-1', 'jurado-2'] }));

      expect(res.created.map((r) => r.supervisorId)).toEqual(['jurado-2']);
      expect(res.skipped).toEqual([{ supervisorId: 'jurado-1', role: 'jurado_final', reason: 'already_assigned' }]);
    });

    it('A4 — el asesor del proyecto no puede ser jurado final', async () => {
      assignmentRepo.findOne.mockResolvedValue({ supervisorId: 'jurado-1', role: AssignmentRole.ASESOR, status: AssignmentStatus.ACTIVE });
      let err: unknown;
      try {
        await service.assignJurado('admin-1', juradoDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('JURADO_IS_ASESOR');
    });

    it('A5 — solo durante el proceso académico, y la postulación debe coincidir', async () => {
      http.get.mockResolvedValue({ id: APP, studentId: STUDENT, projectId: PROJECT, status: 'rejected' });
      let err: unknown;
      try {
        await service.assignJurado('admin-1', juradoDto());
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('APPLICATION_NOT_ASSIGNABLE');
    });
  });

  // ───────────────────────── replaceAssignment ─────────────────────────

  describe('replaceAssignment', () => {
    const old = (extra: Partial<SupervisorAssignment> = {}) =>
      ({
        id: 'old-1',
        supervisorId: 'asesor-1',
        studentId: STUDENT,
        projectId: PROJECT,
        applicationId: APP,
        periodId: PERIOD,
        startDate: '2026-10-01',
        endDate: null,
        role: AssignmentRole.ASESOR,
        status: AssignmentStatus.PENDING_ACCEPTANCE,
        ...extra,
      }) as unknown as SupervisorAssignment;

    it('A8 — en UNA transacción: reserva cupo del nuevo, devuelve el del viejo, marca replaced y crea la nueva', async () => {
      assignmentRepo.findOne.mockResolvedValueOnce(old()).mockResolvedValueOnce(null); // old, y "nuevo es jurado" = no

      const saved = await service.replaceAssignment('old-1', 'admin-1', { newSupervisorId: 'asesor-2', reason: 'cambio solicitado' } as any);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(updated.find((u) => u.id === 'old-1')?.patch).toEqual({ status: AssignmentStatus.REPLACED });
      expect(counterDecrements).toEqual(['asesor-1']);
      expect(supervisors['asesor-2'].currentStudents).toBe(3);
      expect(saved.supervisorId).toBe('asesor-2');
      expect(saved.status).toBe(AssignmentStatus.PENDING_ACCEPTANCE);
      expect(events.publish).toHaveBeenCalledWith('admin.supervisor.replaced', expect.objectContaining({ newSupervisorId: 'asesor-2' }), 'admin-service');
    });

    it('rechaza cuando el nuevo docente está sin cupo (y no deja nada a medias)', async () => {
      assignmentRepo.findOne.mockResolvedValueOnce(old()).mockResolvedValueOnce(null);
      supervisors['asesor-2'].currentStudents = 10;

      let err: unknown;
      try {
        await service.replaceAssignment('old-1', 'admin-1', { newSupervisorId: 'asesor-2' } as any);
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('SUPERVISOR_FULL');
      expect(events.publish).not.toHaveBeenCalled();
    });

    it('no permite reemplazar por el mismo docente, ni una asignación que no es del asesor o ya terminó', async () => {
      assignmentRepo.findOne.mockResolvedValue(old());
      let err: unknown;
      try {
        await service.replaceAssignment('old-1', 'admin-1', { newSupervisorId: 'asesor-1' } as any);
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('SAME_SUPERVISOR');

      assignmentRepo.findOne.mockResolvedValue(old({ role: AssignmentRole.JURADO_ANTEPROYECTO }));
      try {
        await service.replaceAssignment('old-1', 'admin-1', { newSupervisorId: 'asesor-2' } as any);
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('ASSIGNMENT_NOT_REPLACEABLE');

      assignmentRepo.findOne.mockResolvedValue(old({ status: AssignmentStatus.DECLINED }));
      try {
        await service.replaceAssignment('old-1', 'admin-1', { newSupervisorId: 'asesor-2' } as any);
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('ASSIGNMENT_NOT_REPLACEABLE');
    });

    it('el nuevo asesor no puede ser ya jurado del mismo proyecto', async () => {
      assignmentRepo.findOne.mockResolvedValueOnce(old()).mockResolvedValueOnce({ id: 'j' });
      let err: unknown;
      try {
        await service.replaceAssignment('old-1', 'admin-1', { newSupervisorId: 'jurado-1' } as any);
      } catch (e) {
        err = e;
      }
      expect(codeOf(err)).toBe('JURADO_IS_ASESOR');
    });

    it('asignación inexistente → 404', async () => {
      assignmentRepo.findOne.mockResolvedValue(null);
      await expect(service.replaceAssignment('x', 'admin-1', { newSupervisorId: 'asesor-2' } as any)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

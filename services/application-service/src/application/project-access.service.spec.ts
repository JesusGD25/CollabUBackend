import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { ProjectAccessService } from './project-access.service';
import { Application, ApplicationStatus } from './entities/application.entity';
import {
  AcademicRecordStatus,
  ProjectAcademicRecord,
} from './entities/project-academic-record.entity';

const APP_ID = '11111111-1111-1111-1111-111111111111';
const PROJECT_ID = '22222222-2222-2222-2222-222222222222';
const STUDENT_ID = '33333333-3333-3333-3333-333333333333';
const COMPANY_USER_ID = '44444444-4444-4444-4444-444444444444';
const ASESOR_ID = '55555555-5555-5555-5555-555555555555';
const JURADO_ID = '66666666-6666-6666-6666-666666666666';
const OUTSIDER_ID = '77777777-7777-7777-7777-777777777777';

const mockHttpClient = { get: jest.fn(), post: jest.fn() };

const application = {
  id: APP_ID,
  projectId: PROJECT_ID,
  studentId: STUDENT_ID,
  status: ApplicationStatus.IN_PROGRESS,
  notes: 'Candidato dudoso, revisar referencias',
  interviews: [
    { id: 'i1', interviewerNotes: 'Nervioso', resolutionComment: 'Aprobado por poco' },
  ],
} as unknown as Application;

/** El proyecto guarda el userId de la cuenta de empresa en ambos campos. */
const projectBatch = [
  {
    id: PROJECT_ID,
    title: 'Proyecto de prueba',
    companyId: COMPANY_USER_ID,
    createdByUserId: COMPANY_USER_ID,
  },
];

const assignments = [
  { id: 'a1', supervisorId: 's1', supervisorUserId: ASESOR_ID, role: 'asesor', status: 'accepted' },
  {
    id: 'a2',
    supervisorId: 's2',
    supervisorUserId: JURADO_ID,
    role: 'jurado_anteproyecto',
    status: 'accepted',
  },
];

describe('ProjectAccessService', () => {
  let service: ProjectAccessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAccessService,
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get(ProjectAccessService);

    mockHttpClient.post.mockImplementation((svc: string, path: string) => {
      if (path === '/internal/projects/batch-basic') return Promise.resolve(projectBatch);
      if (path === '/internal/users/batch-basic') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    mockHttpClient.get.mockResolvedValue(assignments);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  // RESOLUCIÓN DEL ROL CONTEXTUAL
  // ═══════════════════════════════════════════════════════════════════

  describe('resolveViewer', () => {
    it('reconoce al estudiante dueño de la postulación', async () => {
      const viewer = await service.resolveViewer(application, { id: STUDENT_ID, role: 'student' });
      expect(viewer?.contextRole).toBe('student');
    });

    it('reconoce a la empresa dueña del proyecto', async () => {
      const viewer = await service.resolveViewer(application, {
        id: COMPANY_USER_ID,
        role: 'company',
      });
      expect(viewer?.contextRole).toBe('company');
    });

    it('reconoce al asesor asignado', async () => {
      const viewer = await service.resolveViewer(application, { id: ASESOR_ID, role: 'faculty' });
      expect(viewer?.contextRole).toBe('asesor');
    });

    it('reconoce al jurado de anteproyecto', async () => {
      const viewer = await service.resolveViewer(application, { id: JURADO_ID, role: 'faculty' });
      expect(viewer?.contextRole).toBe('jurado_anteproyecto');
    });

    it('el administrador siempre participa', async () => {
      const viewer = await service.resolveViewer(application, { id: OUTSIDER_ID, role: 'admin' });
      expect(viewer?.contextRole).toBe('admin');
    });

    it('devuelve null para un usuario ajeno al proyecto', async () => {
      const viewer = await service.resolveViewer(application, { id: OUTSIDER_ID, role: 'student' });
      expect(viewer).toBeNull();
    });

    it('ignora asignaciones declinadas, desvinculadas o reemplazadas', async () => {
      mockHttpClient.get.mockResolvedValueOnce([
        { id: 'a3', supervisorId: 's3', supervisorUserId: ASESOR_ID, role: 'asesor', status: 'declined' },
      ]);
      const viewer = await service.resolveViewer(application, { id: ASESOR_ID, role: 'faculty' });
      expect(viewer).toBeNull();
    });

    it('prioriza asesor cuando el mismo docente es asesor y jurado del mismo proyecto', async () => {
      mockHttpClient.get.mockResolvedValueOnce([
        {
          id: 'a4',
          supervisorId: 's4',
          supervisorUserId: ASESOR_ID,
          role: 'jurado_anteproyecto',
          status: 'accepted',
        },
        { id: 'a5', supervisorId: 's4', supervisorUserId: ASESOR_ID, role: 'asesor', status: 'accepted' },
      ]);
      const viewer = await service.resolveViewer(application, { id: ASESOR_ID, role: 'faculty' });
      expect(viewer?.contextRole).toBe('asesor');
      expect(viewer?.assignments).toHaveLength(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERMISOS
  // ═══════════════════════════════════════════════════════════════════

  describe('permisos por rol contextual', () => {
    it('el jurado de anteproyecto solo alcanza su etapa', async () => {
      const viewer = await service.resolveViewer(application, { id: JURADO_ID, role: 'faculty' });
      expect(viewer!.permissions).toEqual(
        expect.arrayContaining(['view_anteproyecto', 'review_anteproyecto']),
      );
      expect(viewer!.permissions).not.toContain('view_deliverables');
      expect(viewer!.permissions).not.toContain('create_deliverable');
      expect(viewer!.permissions).not.toContain('review_deliverable');
      expect(viewer!.permissions).not.toContain('view_progress');
      expect(viewer!.permissions).not.toContain('chat');
    });

    it('el asesor puede crear y revisar entregables, pero no aprobar el anteproyecto', async () => {
      const viewer = await service.resolveViewer(application, { id: ASESOR_ID, role: 'faculty' });
      expect(viewer!.permissions).toEqual(
        expect.arrayContaining(['create_deliverable', 'review_deliverable', 'comment_anteproyecto']),
      );
      expect(viewer!.permissions).not.toContain('review_anteproyecto');
    });

    it('nadie salvo la empresa ve las notas privadas — tampoco el administrador', async () => {
      const admin = await service.resolveViewer(application, { id: OUTSIDER_ID, role: 'admin' });
      const company = await service.resolveViewer(application, {
        id: COMPANY_USER_ID,
        role: 'company',
      });
      expect(admin!.permissions).not.toContain('view_private_notes');
      expect(company!.permissions).toContain('view_private_notes');
    });

    it('la empresa tiene acceso completo al anteproyecto', async () => {
      const viewer = await service.resolveViewer(application, {
        id: COMPANY_USER_ID,
        role: 'company',
      });
      expect(viewer!.permissions).toContain('view_anteproyecto');
    });

    it('solo el administrador revisa documentos, además del jurado final', async () => {
      const admin = await service.resolveViewer(application, { id: OUTSIDER_ID, role: 'admin' });
      const asesor = await service.resolveViewer(application, { id: ASESOR_ID, role: 'faculty' });
      expect(admin!.permissions).toContain('review_document');
      expect(asesor!.permissions).not.toContain('review_document');
    });
  });

  describe('assertAccess / assertPermission', () => {
    it('assertAccess lanza 403 para un usuario ajeno', async () => {
      await expect(
        service.assertAccess(application, { id: OUTSIDER_ID, role: 'student' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('assertPermission lanza 403 cuando falta el permiso concreto', async () => {
      await expect(
        service.assertPermission(application, { id: JURADO_ID, role: 'faculty' }, 'create_deliverable'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('assertPermission devuelve el visor cuando el permiso existe', async () => {
      const viewer = await service.assertPermission(
        application,
        { id: JURADO_ID, role: 'faculty' },
        'review_anteproyecto',
      );
      expect(viewer.contextRole).toBe('jurado_anteproyecto');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // SANEAMIENTO
  // ═══════════════════════════════════════════════════════════════════

  describe('sanitizeApplication', () => {
    it('deja intactas las notas privadas para la empresa', async () => {
      const viewer = await service.resolveViewer(application, {
        id: COMPANY_USER_ID,
        role: 'company',
      });
      const result = service.sanitizeApplication(application, viewer!);
      expect(result.notes).toBe('Candidato dudoso, revisar referencias');
    });

    it('borra notas y comentarios de entrevista para el estudiante', async () => {
      const viewer = await service.resolveViewer(application, { id: STUDENT_ID, role: 'student' });
      const result = service.sanitizeApplication(application, viewer!);
      expect(result.notes).toBeNull();
      expect(result.interviews[0].interviewerNotes).toBeNull();
      expect(result.interviews[0].resolutionComment).toBeNull();
    });

    it('borra notas privadas también para el administrador', async () => {
      const viewer = await service.resolveViewer(application, { id: OUTSIDER_ID, role: 'admin' });
      const result = service.sanitizeApplication(application, viewer!);
      expect(result.notes).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ETAPA DEL CICLO
  // ═══════════════════════════════════════════════════════════════════

  describe('resolveStage', () => {
    const recordWith = (status: AcademicRecordStatus) =>
      ({ status }) as ProjectAcademicRecord;

    it('una postulación pendiente está en la etapa de postulación', () => {
      const stage = service.resolveStage(
        { ...application, status: ApplicationStatus.PENDING } as Application,
        null,
      );
      expect(stage.current).toBe('application');
      expect(stage.waitingOn).toBe('company');
    });

    it('aceptada sin registro académico espera a la asignación', () => {
      const stage = service.resolveStage(
        { ...application, status: ApplicationStatus.ACCEPTED } as Application,
        null,
      );
      expect(stage.current).toBe('academic_assignment');
      expect(stage.waitingOn).toBe('admin');
    });

    it('waiting_anteproyecto sitúa la etapa en anteproyecto y espera al estudiante', () => {
      const stage = service.resolveStage(
        application,
        recordWith(AcademicRecordStatus.WAITING_ANTEPROYECTO),
      );
      expect(stage.current).toBe('anteproyecto');
      expect(stage.waitingOn).toBe('student');
      expect(stage.completed).toEqual(['application', 'selection', 'academic_assignment']);
    });

    it('final_docs_review espera al jurado final', () => {
      const stage = service.resolveStage(
        application,
        recordWith(AcademicRecordStatus.FINAL_DOCS_REVIEW),
      );
      expect(stage.current).toBe('closure');
      expect(stage.waitingOn).toBe('jurado_final');
    });

    it('completado marca todas las etapas como cerradas', () => {
      const stage = service.resolveStage(application, recordWith(AcademicRecordStatus.COMPLETED));
      expect(stage.current).toBe('completed');
      expect(stage.completed).toHaveLength(8);
    });
  });
});

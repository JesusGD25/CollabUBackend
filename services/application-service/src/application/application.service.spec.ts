import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { ApplicationService } from './application.service';
import { ProjectAccessService } from './project-access.service';
import { Application, ApplicationStatus } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview, InterviewStatus, InterviewType } from './entities/interview.entity';
import { StudentDeliverable, DeliverableStatus } from './entities/student-deliverable.entity';
import { DeliverableAttachment } from './entities/deliverable-attachment.entity';
import { ProjectDocument } from './entities/project-document.entity';
import { AcademicSubmission } from './entities/academic-submission.entity';
import { SubmissionHistory } from './entities/submission-history.entity';
import { ProjectAcademicRecord } from './entities/project-academic-record.entity';
import { DeliverableComment } from './entities/deliverable-comment.entity';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn().mockResolvedValue(undefined),
};

const mockProjectAccess = {
  resolveViewer: jest.fn(),
  assertAccess: jest.fn(),
  assertPermission: jest.fn(),
  sanitizeApplication: jest.fn((app: any) => app),
  resolveStage: jest.fn().mockReturnValue({ current: 'development', completed: [], waitingOn: null }),
  getParticipants: jest.fn().mockResolvedValue([]),
  getProject: jest.fn().mockResolvedValue(null),
  getAssignments: jest.fn().mockResolvedValue([]),
};

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STUDENT_ID = 'student-uuid-1';
const PROJECT_ID = 'project-uuid-1';
const APP_ID = 'app-uuid-1';
const COMPANY_ID = 'company-uuid-1';

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: APP_ID,
    projectId: PROJECT_ID,
    studentId: STUDENT_ID,
    status: ApplicationStatus.PENDING,
    coverLetter: 'Carta de presentación con al menos 50 caracteres para cumplir la validación.',
    resumeUrl: null,
    portfolioUrl: null,
    matchScore: null,
    appliedAt: new Date(),
    reviewedAt: null,
    reviewedBy: null,
    acceptedAt: null,
    completedAt: null,
    rejectionReason: null,
    withdrawalReason: null,
    notes: null,
    timeline: [],
    interviews: [],
    deliverables: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Application;
}

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 'interview-uuid-1',
    applicationId: APP_ID,
    scheduledAt: new Date(),
    durationMinutes: 60,
    interviewType: InterviewType.VIDEO,
    location: null,
    meetingLink: null,
    status: InterviewStatus.SCHEDULED,
    interviewerId: COMPANY_ID,
    interviewerNotes: null,
    studentFeedback: null,
    score: null,
    cancelledReason: null,
    rescheduledFrom: null,
    reminderSent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    application: null,
    ...overrides,
  } as unknown as Interview;
}

function makeDeliverable(overrides: Partial<StudentDeliverable> = {}): StudentDeliverable {
  return {
    id: 'deliverable-uuid-1',
    applicationId: APP_ID,
    projectDeliverableId: null,
    title: 'Informe de avance',
    description: null,
    fileUrl: null,
    fileSizeBytes: null,
    fileType: null,
    submittedAt: new Date(),
    status: DeliverableStatus.SUBMITTED,
    feedback: null,
    grade: null,
    reviewedBy: null,
    reviewedAt: null,
    revisionNumber: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    application: null,
    ...overrides,
  } as unknown as StudentDeliverable;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('ApplicationService', () => {
  let service: ApplicationService;
  let applicationRepo: any;
  let timelineRepo: any;
  let interviewRepo: any;
  let deliverableRepo: any;
  let documentRepo: any;
  let submissionRepo: any;
  let submissionHistoryRepo: any;
  let academicRecordRepo: any;
  let deliverableCommentRepo: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationService,
        { provide: getRepositoryToken(Application), useFactory: createMockRepo },
        { provide: getRepositoryToken(ApplicationTimeline), useFactory: createMockRepo },
        { provide: getRepositoryToken(Interview), useFactory: createMockRepo },
        { provide: getRepositoryToken(StudentDeliverable), useFactory: createMockRepo },
        { provide: getRepositoryToken(DeliverableAttachment), useFactory: createMockRepo },
        { provide: getRepositoryToken(ProjectDocument), useFactory: createMockRepo },
        { provide: getRepositoryToken(AcademicSubmission), useFactory: createMockRepo },
        { provide: getRepositoryToken(SubmissionHistory), useFactory: createMockRepo },
        { provide: getRepositoryToken(ProjectAcademicRecord), useFactory: createMockRepo },
        { provide: getRepositoryToken(DeliverableComment), useFactory: createMockRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
        { provide: ProjectAccessService, useValue: mockProjectAccess },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    applicationRepo = module.get(getRepositoryToken(Application));
    timelineRepo = module.get(getRepositoryToken(ApplicationTimeline));
    interviewRepo = module.get(getRepositoryToken(Interview));
    deliverableRepo = module.get(getRepositoryToken(StudentDeliverable));
    documentRepo = module.get(getRepositoryToken(ProjectDocument));
    submissionRepo = module.get(getRepositoryToken(AcademicSubmission));
    submissionHistoryRepo = module.get(getRepositoryToken(SubmissionHistory));
    academicRecordRepo = module.get(getRepositoryToken(ProjectAcademicRecord));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(service).toBeDefined());

  // ═══════════════════════════════════════════════════════════════════
  // CREATE APPLICATION
  // ═══════════════════════════════════════════════════════════════════
  describe('createApplication', () => {
    const dto = {
      projectId: PROJECT_ID,
      coverLetter: 'Carta de presentación con más de 50 caracteres para cumplir la validación.',
    };

    beforeEach(() => {
      mockHttpClient.get.mockResolvedValue({
        exists: true,
        status: 'published',
        companyId: COMPANY_ID,
      });
      mockHttpClient.post.mockResolvedValue({ overallScore: 85.5 });
      mockHttpClient.patch.mockResolvedValue(undefined);
    });

    it('debería crear una postulación exitosamente', async () => {
      const app = makeApplication();
      applicationRepo.findOne
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce(app); // findApplicationById
      applicationRepo.create.mockReturnValue(app);
      applicationRepo.save.mockResolvedValue(app);
      timelineRepo.create.mockReturnValue({});
      timelineRepo.save.mockResolvedValue({});

      const result = await service.createApplication(STUDENT_ID, dto);

      expect(result).toEqual(app);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'application.created',
        expect.objectContaining({ projectId: PROJECT_ID, studentId: STUDENT_ID }),
        'application-service',
      );
    });

    it('debería lanzar BadRequestException si el proyecto no existe', async () => {
      mockHttpClient.get.mockResolvedValue({ exists: false, status: null, companyId: null });
      await expect(service.createApplication(STUDENT_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería lanzar BadRequestException si el proyecto no está publicado', async () => {
      mockHttpClient.get.mockResolvedValue({
        exists: true,
        status: 'draft',
        companyId: COMPANY_ID,
      });
      await expect(service.createApplication(STUDENT_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar ConflictException si ya existe una postulación', async () => {
      applicationRepo.findOne.mockResolvedValueOnce(makeApplication());
      await expect(service.createApplication(STUDENT_ID, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería crear sin matchScore si el Matching Service falla', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Service unavailable'));
      const app = makeApplication({ matchScore: null });
      applicationRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(app);
      applicationRepo.create.mockReturnValue(app);
      applicationRepo.save.mockResolvedValue(app);
      timelineRepo.create.mockReturnValue({});
      timelineRepo.save.mockResolvedValue({});

      const result = await service.createApplication(STUDENT_ID, dto);
      expect(result.matchScore).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // UPDATE STATUS
  // ═══════════════════════════════════════════════════════════════════
  describe('updateStatus', () => {
    it('debería cambiar estado de PENDING a UNDER_REVIEW', async () => {
      const app = makeApplication({ status: ApplicationStatus.PENDING });
      const updated = makeApplication({ status: ApplicationStatus.UNDER_REVIEW });
      applicationRepo.findOne
        .mockResolvedValueOnce(app)  // findApplicationById (update)
        .mockResolvedValueOnce(updated); // findApplicationById (return)
      applicationRepo.save.mockResolvedValue(updated);
      timelineRepo.create.mockReturnValue({});
      timelineRepo.save.mockResolvedValue({});

      const result = await service.updateStatus(APP_ID, COMPANY_ID, {
        status: ApplicationStatus.UNDER_REVIEW,
      });

      expect(result.status).toBe(ApplicationStatus.UNDER_REVIEW);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'application.status.changed',
        expect.objectContaining({ newStatus: ApplicationStatus.UNDER_REVIEW }),
        'application-service',
      );
    });

    it('debería lanzar BadRequestException por transición inválida', async () => {
      const app = makeApplication({ status: ApplicationStatus.REJECTED });
      applicationRepo.findOne.mockResolvedValueOnce(app);
      await expect(
        service.updateStatus(APP_ID, COMPANY_ID, { status: ApplicationStatus.PENDING }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería requerir rejectionReason al rechazar', async () => {
      const app = makeApplication({ status: ApplicationStatus.PENDING });
      applicationRepo.findOne.mockResolvedValueOnce(app);
      await expect(
        service.updateStatus(APP_ID, COMPANY_ID, { status: ApplicationStatus.REJECTED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar NotFoundException si la postulación no existe', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus('not-exist', COMPANY_ID, {
          status: ApplicationStatus.UNDER_REVIEW,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // WITHDRAW
  // ═══════════════════════════════════════════════════════════════════
  describe('withdraw', () => {
    it('debería retirar una postulación propia', async () => {
      const app = makeApplication({ status: ApplicationStatus.PENDING });
      const withdrawn = makeApplication({ status: ApplicationStatus.WITHDRAWN });
      applicationRepo.findOne
        .mockResolvedValueOnce(app)
        .mockResolvedValueOnce(withdrawn);
      applicationRepo.save.mockResolvedValue(withdrawn);
      timelineRepo.create.mockReturnValue({});
      timelineRepo.save.mockResolvedValue({});

      const result = await service.withdraw(APP_ID, STUDENT_ID, {
        withdrawalReason: 'Encontré otro proyecto más adecuado',
      });
      expect(result.status).toBe(ApplicationStatus.WITHDRAWN);
    });

    it('debería lanzar ForbiddenException si no es el dueño', async () => {
      const app = makeApplication({ studentId: 'other-student' });
      applicationRepo.findOne.mockResolvedValueOnce(app);
      await expect(
        service.withdraw(APP_ID, STUDENT_ID, {
          withdrawalReason: 'Intento no autorizado',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar BadRequestException si ya está rechazada', async () => {
      const app = makeApplication({
        studentId: STUDENT_ID,
        status: ApplicationStatus.REJECTED,
      });
      applicationRepo.findOne.mockResolvedValueOnce(app);
      await expect(
        service.withdraw(APP_ID, STUDENT_ID, { withdrawalReason: 'Razón de prueba' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // INTERVIEWS
  // ═══════════════════════════════════════════════════════════════════
  describe('scheduleInterview', () => {
    it('debería programar una entrevista para postulación shortlisted', async () => {
      const app = makeApplication({ status: ApplicationStatus.SHORTLISTED });
      const updatedApp = makeApplication({ status: ApplicationStatus.INTERVIEW });
      const interview = makeInterview();

      // findApplicationById para scheduleInterview
      applicationRepo.findOne.mockResolvedValueOnce(app);
      // findApplicationById dentro de updateStatus (x2)
      applicationRepo.findOne.mockResolvedValueOnce(app).mockResolvedValueOnce(updatedApp);
      applicationRepo.save.mockResolvedValue(updatedApp);
      timelineRepo.create.mockReturnValue({});
      timelineRepo.save.mockResolvedValue({});
      interviewRepo.create.mockReturnValue(interview);
      interviewRepo.save.mockResolvedValue(interview);

      const result = await service.scheduleInterview(APP_ID, COMPANY_ID, {
        scheduledAt: new Date().toISOString(),
        interviewType: InterviewType.VIDEO,
      });
      expect(result).toEqual(interview);
    });

    it('debería lanzar BadRequestException si la postulación no está en estado adecuado', async () => {
      const app = makeApplication({ status: ApplicationStatus.REJECTED });
      applicationRepo.findOne.mockResolvedValue(app);
      await expect(
        service.scheduleInterview(APP_ID, COMPANY_ID, {
          scheduledAt: new Date().toISOString(),
          interviewType: InterviewType.PHONE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeInterview', () => {
    it('debería completar una entrevista', async () => {
      const app = makeApplication();
      const interview = makeInterview();
      const completed = makeInterview({ status: InterviewStatus.COMPLETED, score: 90, interviewerNotes: 'Excelente candidato' });

      applicationRepo.findOne.mockResolvedValue(app);
      interviewRepo.findOne.mockResolvedValue(interview);
      interviewRepo.save.mockResolvedValue(completed);

      const result = await service.completeInterview(APP_ID, 'interview-uuid-1', COMPANY_ID, {
        score: 90,
        interviewerNotes: 'Excelente candidato',
        resolution: 'passed' as any,
      });
      expect(interviewRepo.save).toHaveBeenCalled();
    });
  });

  describe('cancelInterview', () => {
    it('debería cancelar una entrevista programada', async () => {
      const app = makeApplication();
      const interview = makeInterview({ status: InterviewStatus.SCHEDULED });
      const cancelled = makeInterview({ status: InterviewStatus.CANCELLED });

      applicationRepo.findOne.mockResolvedValue(app);
      interviewRepo.findOne.mockResolvedValue(interview);
      interviewRepo.save.mockResolvedValue(cancelled);

      await service.cancelInterview(APP_ID, 'interview-uuid-1', COMPANY_ID, {
        cancelledReason: 'Conflicto de agenda',
      });
      expect(interviewRepo.save).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si la entrevista ya está completada', async () => {
      const app = makeApplication();
      const interview = makeInterview({ status: InterviewStatus.COMPLETED });
      applicationRepo.findOne.mockResolvedValue(app);
      interviewRepo.findOne.mockResolvedValue(interview);
      await expect(
        service.cancelInterview(APP_ID, 'interview-uuid-1', COMPANY_ID, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // DELIVERABLES
  // ═══════════════════════════════════════════════════════════════════
  describe('submitDeliverable', () => {
    it('debería enviar un entregable en postulación aceptada', async () => {
      const app = makeApplication({ status: ApplicationStatus.ACCEPTED });
      const deliverable = makeDeliverable();

      applicationRepo.findOne.mockResolvedValue(app);
      deliverableRepo.create.mockReturnValue(deliverable);
      deliverableRepo.save.mockResolvedValue(deliverable);

      const result = await service.submitDeliverable(APP_ID, STUDENT_ID, {
        title: 'Informe de avance',
      });
      expect(result).toEqual(deliverable);
    });

    it('debería lanzar ForbiddenException si no es el dueño', async () => {
      const app = makeApplication({
        status: ApplicationStatus.ACCEPTED,
        studentId: 'other-student',
      });
      applicationRepo.findOne.mockResolvedValue(app);
      await expect(
        service.submitDeliverable(APP_ID, STUDENT_ID, { title: 'Informe' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería lanzar BadRequestException si la postulación no está aceptada', async () => {
      const app = makeApplication({ status: ApplicationStatus.PENDING });
      applicationRepo.findOne.mockResolvedValue(app);
      await expect(
        service.submitDeliverable(APP_ID, STUDENT_ID, { title: 'Informe' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewDeliverable', () => {
    it('debería aprobar un entregable enviado', async () => {
      const app = makeApplication();
      const deliverable = makeDeliverable({ status: DeliverableStatus.SUBMITTED });
      const approved = makeDeliverable({
        status: DeliverableStatus.APPROVED,
        grade: 95,
        reviewedBy: COMPANY_ID,
      });

      applicationRepo.findOne.mockResolvedValue(app);
      deliverableRepo.findOne.mockResolvedValue(deliverable);
      deliverableRepo.save.mockResolvedValue(approved);

      const result = await service.reviewDeliverable(
        APP_ID,
        'deliverable-uuid-1',
        COMPANY_ID,
        DeliverableStatus.APPROVED,
        { grade: 95, feedback: 'Excelente trabajo' },
      );
      expect(deliverableRepo.save).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si el entregable no está en submitted', async () => {
      const app = makeApplication();
      const deliverable = makeDeliverable({ status: DeliverableStatus.APPROVED });

      applicationRepo.findOne.mockResolvedValue(app);
      deliverableRepo.findOne.mockResolvedValue(deliverable);

      await expect(
        service.reviewDeliverable(
          APP_ID,
          'deliverable-uuid-1',
          COMPANY_ID,
          DeliverableStatus.APPROVED,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // WITHDRAW ALL BY STUDENT (evento interno)
  // ═══════════════════════════════════════════════════════════════════
  describe('withdrawAllByStudent', () => {
    it('debería retirar todas las postulaciones activas del estudiante', async () => {
      const app = makeApplication({ status: ApplicationStatus.PENDING });
      // find for each active status
      applicationRepo.find
        .mockResolvedValueOnce([app]) // PENDING
        .mockResolvedValueOnce([])    // UNDER_REVIEW
        .mockResolvedValueOnce([])    // SHORTLISTED
        .mockResolvedValueOnce([]);   // INTERVIEW
      applicationRepo.save.mockResolvedValue({ ...app, status: ApplicationStatus.WITHDRAWN });
      timelineRepo.create.mockReturnValue({});
      timelineRepo.save.mockResolvedValue({});

      await service.withdrawAllByStudent(STUDENT_ID);
      expect(applicationRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // COUNTS
  // ═══════════════════════════════════════════════════════════════════
  describe('countByProject', () => {
    it('debería retornar el conteo de postulaciones', async () => {
      applicationRepo.count.mockResolvedValue(5);
      const result = await service.countByProject(PROJECT_ID);
      expect(result).toBe(5);
    });
  });

  describe('countActiveByStudent', () => {
    it('debería contar postulaciones pendientes del estudiante', async () => {
      applicationRepo.count.mockResolvedValue(2);
      const result = await service.countActiveByStudent(STUDENT_ID);
      expect(result).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ANTEPROYECTO
  // ═══════════════════════════════════════════════════════════════════
  describe('submitAnteproyecto', () => {
    it('debería rechazar si el estudiante no es dueño de la postulación', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      await expect(
        service.submitAnteproyecto(APP_ID, 'otro-estudiante', { fileId: 'file-1' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('primera entrega marca SUBMITTED e incrementa versión', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'pending_submission', versionNumber: 0, correctionCount: 0,
      });
      submissionRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      mockHttpClient.get.mockResolvedValue(null);

      const result = await service.submitAnteproyecto(APP_ID, STUDENT_ID, { fileId: 'file-1' });

      expect(result.status).toBe('submitted');
      expect(result.versionNumber).toBe(1);
      expect(submissionHistoryRepo.save).toHaveBeenCalled();
    });

    it('re-entrega desde needs_revision marca REVISED', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'needs_revision', versionNumber: 1, correctionCount: 1,
      });
      submissionRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      mockHttpClient.get.mockResolvedValue(null);

      const result = await service.submitAnteproyecto(APP_ID, STUDENT_ID, { fileId: 'file-2' });

      expect(result.status).toBe('revised');
      expect(result.versionNumber).toBe(2);
    });

    it('debería rechazar entrega en estado no válido (approved)', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      submissionRepo.findOne.mockResolvedValue({ id: 'sub-1', applicationId: APP_ID, status: 'approved', versionNumber: 1 });

      await expect(
        service.submitAnteproyecto(APP_ID, STUDENT_ID, { fileId: 'file-3' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reviewAnteproyecto', () => {
    const juradoAssignment = [{ id: 'a1', supervisorId: 's1', supervisorUserId: 'faculty-jurado', role: 'jurado_anteproyecto', status: 'accepted' }];

    it('debería rechazar si el usuario no es jurado de esta aplicación', async () => {
      mockHttpClient.get.mockResolvedValue([]);
      await expect(
        service.reviewAnteproyecto(APP_ID, 'faculty-x', { action: 'approve' as any }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no puede rechazar sin al menos 2 correcciones previas', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(juradoAssignment)
        .mockResolvedValueOnce({ value: 2 });
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'submitted', correctionCount: 0,
      });

      await expect(
        service.reviewAnteproyecto(APP_ID, 'faculty-jurado', { action: 'reject' as any, comment: 'no sirve' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('correction incrementa correctionCount y pasa a NEEDS_REVISION', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(juradoAssignment)
        .mockResolvedValueOnce({ value: 2 })
        .mockResolvedValueOnce({ value: 5 })
        .mockResolvedValueOnce({ value: [] });
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'submitted', correctionCount: 0,
      });
      submissionRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      applicationRepo.findOne.mockResolvedValue(makeApplication());

      const result = await service.reviewAnteproyecto(APP_ID, 'faculty-jurado', { action: 'correction' as any, comment: 'corrige esto' });

      expect(result.status).toBe('needs_revision');
      expect(result.correctionCount).toBe(1);
    });

    it('approve mueve el academic record a WAITING_DOCUMENTS y publica evento', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce(juradoAssignment)
        .mockResolvedValueOnce({ value: 2 })
        .mockResolvedValueOnce(juradoAssignment)
        .mockResolvedValueOnce(juradoAssignment);
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'revised', correctionCount: 2,
      });
      submissionRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      academicRecordRepo.findOne.mockResolvedValue({ id: 'rec-1', applicationId: APP_ID, status: 'waiting_anteproyecto' });
      academicRecordRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      const result = await service.reviewAnteproyecto(APP_ID, 'faculty-jurado', { action: 'approve' as any });

      expect(result.status).toBe('approved');
      expect(academicRecordRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'waiting_documents' }));
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'academic.anteproyecto.approved',
        expect.objectContaining({ applicationId: APP_ID }),
        'application-service',
      );
    });

    it('con 2 jurados, un solo voto approve deja el estado en under_review (no resuelve aún)', async () => {
      const twoJurados = [
        { id: 'a1', supervisorId: 's1', supervisorUserId: 'faculty-jurado', role: 'jurado_anteproyecto', status: 'accepted' },
        { id: 'a2', supervisorId: 's2', supervisorUserId: 'faculty-jurado-2', role: 'jurado_anteproyecto', status: 'accepted' },
      ];
      mockHttpClient.get
        .mockResolvedValueOnce(twoJurados)
        .mockResolvedValueOnce({ value: 2 })
        .mockResolvedValueOnce(twoJurados)
        .mockResolvedValueOnce(twoJurados);
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'revised', correctionCount: 2, juradoVotes: null,
      });
      submissionRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      applicationRepo.findOne.mockResolvedValue(makeApplication());

      const result = await service.reviewAnteproyecto(APP_ID, 'faculty-jurado', { action: 'approve' as any });

      expect(result.status).toBe('under_review');
      expect(result.juradoVotes).toEqual({ 'faculty-jurado': 'approve' });
      expect(academicRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).not.toHaveBeenCalledWith('academic.anteproyecto.approved', expect.anything(), expect.anything());
    });

    it('con 2 jurados, si uno rechaza tras que ambos voten, el resultado es rejected', async () => {
      const twoJurados = [
        { id: 'a1', supervisorId: 's1', supervisorUserId: 'faculty-jurado', role: 'jurado_anteproyecto', status: 'accepted' },
        { id: 'a2', supervisorId: 's2', supervisorUserId: 'faculty-jurado-2', role: 'jurado_anteproyecto', status: 'accepted' },
      ];
      mockHttpClient.get
        .mockResolvedValueOnce(twoJurados)
        .mockResolvedValueOnce({ value: 2 })
        .mockResolvedValueOnce(twoJurados)
        .mockResolvedValueOnce(twoJurados);
      submissionRepo.findOne.mockResolvedValue({
        id: 'sub-1', applicationId: APP_ID, status: 'under_review', correctionCount: 2,
        juradoVotes: { 'faculty-jurado': 'approve' },
      });
      submissionRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      applicationRepo.findOne.mockResolvedValue(makeApplication());

      const result = await service.reviewAnteproyecto(APP_ID, 'faculty-jurado-2', { action: 'reject' as any, comment: 'no cumple' });

      expect(result.status).toBe('rejected');
      expect(academicRecordRepo.save).not.toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'academic.anteproyecto.rejected',
        expect.objectContaining({ applicationId: APP_ID }),
        'application-service',
      );
    });
  });

  describe('uploadDocument', () => {
    it('crea un nuevo ProjectDocument cuando no existe entrega previa', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      mockHttpClient.get.mockResolvedValue({ id: 'req-1', name: 'Carta' });
      documentRepo.findOne.mockResolvedValue(null);
      documentRepo.create.mockImplementation((v: any) => v);
      documentRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'doc-1', ...v }));

      const result = await service.uploadDocument(APP_ID, STUDENT_ID, { requirementId: 'req-1', fileId: 'file-1' });

      expect(result.status).toBe('submitted');
      expect(result.fileId).toBe('file-1');
    });

    it('lanza NotFoundException si el requirement no existe', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApplication());
      mockHttpClient.get.mockRejectedValue(new Error('404'));

      await expect(
        service.uploadDocument(APP_ID, STUDENT_ID, { requirementId: 'missing', fileId: 'file-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

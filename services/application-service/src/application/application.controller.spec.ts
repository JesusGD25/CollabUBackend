import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { ApplicationStatus } from './entities/application.entity';
import { InterviewType } from './entities/interview.entity';
import { DeliverableStatus, RequesterType } from './entities/student-deliverable.entity';

// ─── Mock del servicio ────────────────────────────────────────────────────────

const mockApplicationService = {
  authorize: jest.fn(),
  getProjectContext: jest.fn(),
  createApplication: jest.fn(),
  getMyApplications: jest.fn(),
  findApplicationById: jest.fn(),
  findApplicationForViewer: jest.fn(),
  getApplicationTimeline: jest.fn(),
  getProjectApplications: jest.fn(),
  updateStatus: jest.fn(),
  withdraw: jest.fn(),
  scheduleInterview: jest.fn(),
  getInterviews: jest.fn(),
  completeInterview: jest.fn(),
  cancelInterview: jest.fn(),
  rescheduleInterview: jest.fn(),
  setInterviewBrief: jest.fn(),
  setInterviewSolution: jest.fn(),
  updateNotes: jest.fn(),
  submitDeliverable: jest.fn(),
  updateDeliverable: jest.fn(),
  getDeliverables: jest.fn(),
  reviewDeliverable: jest.fn(),
  createDeliverable: jest.fn(),
};

const mockUser = { id: 'user-uuid-1', role: 'student' };
const mockCompanyUser = { id: 'company-uuid-1', role: 'company' };

/** Respuesta por defecto de `authorize`: participante con todos los permisos. */
const viewerResult = (contextRole: string, permissions: string[] = ['view_private_notes']) => ({
  application: { id: 'app-uuid-1' },
  viewer: { userId: 'user-uuid-1', contextRole, permissions, assignments: [] },
});

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('ApplicationController', () => {
  let controller: ApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        { provide: ApplicationService, useValue: mockApplicationService },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
    mockApplicationService.authorize.mockResolvedValue(viewerResult('company'));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => expect(controller).toBeDefined());

  // ═══════════════════════════════════════════════════════════════════
  // POSTULACIONES
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('debería delegar a applicationService.createApplication', async () => {
      const dto = { projectId: 'project-uuid-1' };
      const expected = { id: 'app-uuid-1', ...dto };
      mockApplicationService.createApplication.mockResolvedValue(expected);

      const result = await controller.create(mockUser, dto as any);
      expect(mockApplicationService.createApplication).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(expected);
    });
  });

  describe('getMyApplications', () => {
    it('debería delegar a applicationService.getMyApplications', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockApplicationService.getMyApplications.mockResolvedValue(expected);

      const result = await controller.getMyApplications(mockUser, query as any);
      expect(mockApplicationService.getMyApplications).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('findOne', () => {
    it('debería delegar a applicationService.findApplicationForViewer', async () => {
      const expected = { id: 'app-uuid-1' };
      mockApplicationService.findApplicationForViewer.mockResolvedValue(expected);

      const result = await controller.findOne(mockUser, 'app-uuid-1');
      expect(mockApplicationService.findApplicationForViewer).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getContext', () => {
    it('debería delegar a applicationService.getProjectContext', async () => {
      const expected = { viewer: { contextRole: 'student' } };
      mockApplicationService.getProjectContext.mockResolvedValue(expected);

      const result = await controller.getContext(mockUser, 'app-uuid-1');
      expect(mockApplicationService.getProjectContext).toHaveBeenCalledWith('app-uuid-1', mockUser);
      expect(result).toEqual(expected);
    });
  });

  describe('getTimeline', () => {
    it('debería autorizar antes de devolver el historial', async () => {
      const expected = [{ id: 'timeline-uuid-1' }];
      mockApplicationService.getApplicationTimeline.mockResolvedValue(expected);

      const result = await controller.getTimeline(mockUser, 'app-uuid-1');
      expect(mockApplicationService.authorize).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser,
        'view_activity',
      );
      expect(mockApplicationService.getApplicationTimeline).toHaveBeenCalledWith('app-uuid-1');
      expect(result).toEqual(expected);
    });

    it('debería propagar el 403 cuando el usuario no participa en el proyecto', async () => {
      mockApplicationService.authorize.mockRejectedValueOnce(
        new ForbiddenException('No tienes acceso a esta postulación'),
      );

      await expect(controller.getTimeline(mockUser, 'app-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockApplicationService.getApplicationTimeline).not.toHaveBeenCalled();
    });
  });

  describe('getByProject', () => {
    it('debería delegar a applicationService.getProjectApplications', async () => {
      const expected = { data: [], total: 0 };
      const query = {};
      mockApplicationService.getProjectApplications.mockResolvedValue(expected);

      const result = await controller.getByProject(
        mockCompanyUser,
        'project-uuid-1',
        query as any,
      );
      expect(mockApplicationService.getProjectApplications).toHaveBeenCalledWith(
        'project-uuid-1',
        mockCompanyUser.id,
        query,
      );
    });
  });

  describe('updateStatus', () => {
    it('debería delegar a applicationService.updateStatus', async () => {
      const dto = { status: ApplicationStatus.UNDER_REVIEW };
      const expected = { id: 'app-uuid-1', status: ApplicationStatus.UNDER_REVIEW };
      mockApplicationService.updateStatus.mockResolvedValue(expected);

      const result = await controller.updateStatus(mockCompanyUser, 'app-uuid-1', dto as any);
      expect(mockApplicationService.updateStatus).toHaveBeenCalledWith(
        'app-uuid-1',
        mockCompanyUser.id,
        dto,
      );
    });
  });

  describe('withdraw', () => {
    it('debería delegar a applicationService.withdraw', async () => {
      const dto = { withdrawalReason: 'Encontré otro proyecto más adecuado para mi perfil' };
      const expected = { id: 'app-uuid-1', status: ApplicationStatus.WITHDRAWN };
      mockApplicationService.withdraw.mockResolvedValue(expected);

      const result = await controller.withdraw(mockUser, 'app-uuid-1', dto);
      expect(mockApplicationService.withdraw).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser.id,
        dto,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENTREVISTAS
  // ═══════════════════════════════════════════════════════════════════

  describe('scheduleInterview', () => {
    it('debería delegar a applicationService.scheduleInterview', async () => {
      const dto = {
        scheduledAt: new Date().toISOString(),
        interviewType: InterviewType.VIDEO,
      };
      const expected = { id: 'interview-uuid-1' };
      mockApplicationService.scheduleInterview.mockResolvedValue(expected);

      const result = await controller.scheduleInterview(
        mockCompanyUser,
        'app-uuid-1',
        dto as any,
      );
      expect(mockApplicationService.scheduleInterview).toHaveBeenCalledWith(
        'app-uuid-1',
        mockCompanyUser.id,
        dto,
      );
    });
  });

  describe('getInterviews', () => {
    it('debería delegar a applicationService.getInterviews', async () => {
      const expected = [{ id: 'interview-uuid-1' }];
      mockApplicationService.getInterviews.mockResolvedValue(expected);

      const result = await controller.getInterviews(mockCompanyUser, 'app-uuid-1');
      expect(mockApplicationService.getInterviews).toHaveBeenCalledWith('app-uuid-1', false);
    });

    it('debería sanear las notas privadas para quien no es la empresa', async () => {
      mockApplicationService.authorize.mockResolvedValueOnce(viewerResult('student', ['view_project']));
      mockApplicationService.getInterviews.mockResolvedValue([]);

      await controller.getInterviews(mockUser, 'app-uuid-1');
      expect(mockApplicationService.getInterviews).toHaveBeenCalledWith('app-uuid-1', true);
    });
  });

  describe('completeInterview', () => {
    it('debería delegar a applicationService.completeInterview', async () => {
      const dto = { score: 90 };
      mockApplicationService.completeInterview.mockResolvedValue({ id: 'interview-uuid-1' });

      await controller.completeInterview(
        mockCompanyUser,
        'app-uuid-1',
        'interview-uuid-1',
        dto as any,
      );
      expect(mockApplicationService.completeInterview).toHaveBeenCalledWith(
        'app-uuid-1',
        'interview-uuid-1',
        mockCompanyUser.id,
        dto,
      );
    });
  });

  describe('cancelInterview', () => {
    it('debería delegar a applicationService.cancelInterview', async () => {
      const dto = { cancelledReason: 'Conflicto de agenda' };
      mockApplicationService.cancelInterview.mockResolvedValue({ id: 'interview-uuid-1' });

      await controller.cancelInterview(
        mockCompanyUser,
        'app-uuid-1',
        'interview-uuid-1',
        dto as any,
      );
      expect(mockApplicationService.cancelInterview).toHaveBeenCalledWith(
        'app-uuid-1',
        'interview-uuid-1',
        mockCompanyUser.id,
        dto,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  // ENTREGABLES
  // ═══════════════════════════════════════════════════════════════════

  describe('submitDeliverable', () => {
    it('debería delegar a applicationService.submitDeliverable', async () => {
      const dto = { title: 'Informe de avance' };
      const expected = { id: 'deliverable-uuid-1' };
      mockApplicationService.submitDeliverable.mockResolvedValue(expected);

      const result = await controller.submitDeliverable(mockUser, 'app-uuid-1', dto as any);
      expect(mockApplicationService.submitDeliverable).toHaveBeenCalledWith(
        'app-uuid-1',
        mockUser.id,
        dto,
      );
    });
  });

  describe('approveDeliverable', () => {
    it('debería delegar a applicationService.reviewDeliverable con APPROVED', async () => {
      const dto = { grade: 95, feedback: 'Excelente' };
      mockApplicationService.reviewDeliverable.mockResolvedValue({ id: 'deliverable-uuid-1' });

      await controller.approveDeliverable(
        mockCompanyUser,
        'app-uuid-1',
        'deliverable-uuid-1',
        dto as any,
      );
      expect(mockApplicationService.reviewDeliverable).toHaveBeenCalledWith(
        'app-uuid-1',
        'deliverable-uuid-1',
        mockCompanyUser.id,
        DeliverableStatus.APPROVED,
        dto,
        expect.any(String),
      );
    });
  });

  describe('rejectDeliverable', () => {
    it('debería delegar a applicationService.reviewDeliverable con REJECTED', async () => {
      const dto = { feedback: 'No cumple los requisitos' };
      mockApplicationService.reviewDeliverable.mockResolvedValue({ id: 'deliverable-uuid-1' });

      await controller.rejectDeliverable(
        mockCompanyUser,
        'app-uuid-1',
        'deliverable-uuid-1',
        dto as any,
      );
      expect(mockApplicationService.reviewDeliverable).toHaveBeenCalledWith(
        'app-uuid-1',
        'deliverable-uuid-1',
        mockCompanyUser.id,
        DeliverableStatus.REJECTED,
        dto,
        expect.any(String),
      );
    });
  });

  describe('requestRevision', () => {
    it('debería delegar a applicationService.reviewDeliverable con NEEDS_REVISION', async () => {
      const dto = { feedback: 'Necesita más detalle' };
      mockApplicationService.reviewDeliverable.mockResolvedValue({ id: 'deliverable-uuid-1' });

      await controller.requestRevision(
        mockCompanyUser,
        'app-uuid-1',
        'deliverable-uuid-1',
        dto as any,
      );
      expect(mockApplicationService.reviewDeliverable).toHaveBeenCalledWith(
        'app-uuid-1',
        'deliverable-uuid-1',
        mockCompanyUser.id,
        DeliverableStatus.NEEDS_REVISION,
        dto,
        expect.any(String),
      );
    });
  });

  describe('createDeliverable', () => {
    it('debería marcar requesterType=asesor cuando el rol contextual es asesor', async () => {
      mockApplicationService.authorize.mockResolvedValueOnce(
        viewerResult('asesor', ['create_deliverable']),
      );
      mockApplicationService.createDeliverable.mockResolvedValue({ id: 'deliverable-uuid-1' });

      await controller.createDeliverable(
        { id: 'faculty-uuid-1', role: 'faculty' },
        'app-uuid-1',
        { title: 'Informe parcial' } as any,
      );
      expect(mockApplicationService.createDeliverable).toHaveBeenCalledWith(
        'app-uuid-1',
        'faculty-uuid-1',
        { title: 'Informe parcial' },
        RequesterType.ASESOR,
      );
    });

    it('debería rechazar al jurado, que carece del permiso create_deliverable', async () => {
      mockApplicationService.authorize.mockRejectedValueOnce(
        new ForbiddenException('Tu rol en este proyecto (jurado_anteproyecto) no permite esta acción'),
      );

      await expect(
        controller.createDeliverable(
          { id: 'faculty-uuid-2', role: 'faculty' },
          'app-uuid-1',
          { title: 'Informe' } as any,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockApplicationService.createDeliverable).not.toHaveBeenCalled();
    });
  });
});

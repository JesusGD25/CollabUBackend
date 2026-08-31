import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { AdminService } from './admin.service';
import { AcademicPeriod, PeriodStatus } from './entities/academic-period.entity';
import { AcademicProgram } from './entities/academic-program.entity';
import { CompanyVerification, VerificationAction } from './entities/company-verification.entity';
import { Supervisor, SupervisorRole } from './entities/supervisor.entity';
import { SupervisorAssignment, AssignmentRole, AssignmentStatus } from './entities/supervisor-assignment.entity';
import { SupervisorAssignmentHistory } from './entities/supervisor-assignment-history.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { ProjectRejectionCategory } from './entities/project-rejection-category.entity';
import { AcademicTemplate } from './entities/academic-template.entity';
import { DocumentRequirement } from './entities/document-requirement.entity';
import { SkillCatalog } from './entities/skill-catalog.entity';
import { SkillProgramMapping } from './entities/skill-program-mapping.entity';

// ─── Repository mock factory ─────────────────────────────────────────────────

const repoMock = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  decrement: jest.fn(),
});

const mockEventPublisher = { publish: jest.fn() };
const mockHttpClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn().mockResolvedValue(undefined),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let periodRepo: ReturnType<typeof repoMock>;
  let programRepo: ReturnType<typeof repoMock>;
  let verificationRepo: ReturnType<typeof repoMock>;
  let supervisorRepo: ReturnType<typeof repoMock>;
  let assignmentRepo: ReturnType<typeof repoMock>;
  let settingRepo: ReturnType<typeof repoMock>;
  let rejectionCategoryRepo: ReturnType<typeof repoMock>;
  let historyRepo: ReturnType<typeof repoMock>;
  let templateRepo: ReturnType<typeof repoMock>;
  let documentRequirementRepo: ReturnType<typeof repoMock>;
  let skillCatalogRepo: ReturnType<typeof repoMock>;
  let skillProgramMappingRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    periodRepo = repoMock();
    programRepo = repoMock();
    verificationRepo = repoMock();
    supervisorRepo = repoMock();
    assignmentRepo = repoMock();
    settingRepo = repoMock();
    rejectionCategoryRepo = repoMock();
    historyRepo = repoMock();
    templateRepo = repoMock();
    documentRequirementRepo = repoMock();
    skillCatalogRepo = repoMock();
    skillProgramMappingRepo = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(AcademicPeriod), useValue: periodRepo },
        { provide: getRepositoryToken(AcademicProgram), useValue: programRepo },
        { provide: getRepositoryToken(CompanyVerification), useValue: verificationRepo },
        { provide: getRepositoryToken(Supervisor), useValue: supervisorRepo },
        { provide: getRepositoryToken(SupervisorAssignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(SystemSetting), useValue: settingRepo },
        { provide: getRepositoryToken(ProjectRejectionCategory), useValue: rejectionCategoryRepo },
        { provide: getRepositoryToken(SupervisorAssignmentHistory), useValue: historyRepo },
        { provide: getRepositoryToken(AcademicTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(DocumentRequirement), useValue: documentRequirementRepo },
        { provide: getRepositoryToken(SkillCatalog), useValue: skillCatalogRepo },
        { provide: getRepositoryToken(SkillProgramMapping), useValue: skillProgramMappingRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
        { provide: MicroserviceHttpClient, useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      verificationRepo.count.mockResolvedValue(3);
      programRepo.count.mockResolvedValue(5);
      periodRepo.count.mockResolvedValue(1);
      supervisorRepo.count.mockResolvedValue(8);
      assignmentRepo.count.mockResolvedValue(12);
      periodRepo.findOne.mockResolvedValue({ name: '2025-A' });

      const result = await service.getDashboard();

      expect(result.stats.currentPeriod).toBe('2025-A');
      expect(result.stats.totalSupervisors).toBe(8);
    });

    it('should return null currentPeriod when none set', async () => {
      verificationRepo.count.mockResolvedValue(0);
      programRepo.count.mockResolvedValue(0);
      periodRepo.count.mockResolvedValue(0);
      supervisorRepo.count.mockResolvedValue(0);
      assignmentRepo.count.mockResolvedValue(0);
      periodRepo.findOne.mockResolvedValue(null);

      const result = await service.getDashboard();

      expect(result.stats.currentPeriod).toBeNull();
    });
  });

  // ─── Academic Periods ────────────────────────────────────────────────────────

  describe('createPeriod', () => {
    it('should create a new academic period', async () => {
      periodRepo.findOne.mockResolvedValue(null);
      const dto = { name: '2025-A', startDate: '2025-02-01', endDate: '2025-06-30' };
      const saved = { id: 'period-1', ...dto, status: PeriodStatus.PLANNING, isCurrent: false };
      periodRepo.create.mockReturnValue(saved);
      periodRepo.save.mockResolvedValue(saved);

      const result = await service.createPeriod(dto as any);

      expect(periodRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'admin.period.created',
        expect.objectContaining({ periodId: 'period-1', name: '2025-A' }),
        'admin-service',
      );
      expect(result.name).toBe('2025-A');
    });

    it('should throw ConflictException if period name exists', async () => {
      periodRepo.findOne.mockResolvedValue({ id: 'existing', name: '2025-A' });

      await expect(
        service.createPeriod({ name: '2025-A', startDate: '2025-02-01', endDate: '2025-06-30' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getPeriods', () => {
    it('should return paginated periods', async () => {
      const periods = [{ id: 'p-1', name: '2025-A' }];
      periodRepo.findAndCount.mockResolvedValue([periods, 1]);

      const result = await service.getPeriods({ page: 1, limit: 20 });

      expect(result.data).toEqual(periods);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getPeriodById', () => {
    it('should return period by id', async () => {
      const period = { id: 'p-1', name: '2025-A' };
      periodRepo.findOne.mockResolvedValue(period);

      const result = await service.getPeriodById('p-1');
      expect(result).toEqual(period);
    });

    it('should throw NotFoundException if not found', async () => {
      periodRepo.findOne.mockResolvedValue(null);
      await expect(service.getPeriodById('p-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePeriod', () => {
    it('should update period and unset other current periods when isCurrent=true', async () => {
      const period = { id: 'p-1', name: '2025-A', isCurrent: false };
      periodRepo.findOne.mockResolvedValue(period);
      periodRepo.update.mockResolvedValue({ affected: 1 });
      periodRepo.save.mockResolvedValue({ ...period, isCurrent: true });

      const result = await service.updatePeriod('p-1', { isCurrent: true });

      expect(periodRepo.update).toHaveBeenCalledWith({ isCurrent: true }, { isCurrent: false });
      expect(result.isCurrent).toBe(true);
    });
  });

  // ─── Academic Programs ───────────────────────────────────────────────────────

  describe('createProgram', () => {
    it('should create a new program', async () => {
      programRepo.findOne.mockResolvedValue(null);
      const dto = { name: 'Ingeniería de Sistemas', code: 'ISC' };
      const saved = { id: 'prog-1', ...dto };
      programRepo.create.mockReturnValue(saved);
      programRepo.save.mockResolvedValue(saved);

      const result = await service.createProgram(dto as any);

      expect(programRepo.save).toHaveBeenCalled();
      expect(result.code).toBe('ISC');
    });

    it('should throw ConflictException if code exists', async () => {
      programRepo.findOne.mockResolvedValue({ id: 'existing', code: 'ISC' });

      await expect(
        service.createProgram({ name: 'Other', code: 'ISC' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getPrograms', () => {
    it('should return all programs', async () => {
      const programs = [{ id: 'prog-1', code: 'ISC', isActive: true }];
      programRepo.find.mockResolvedValue(programs);

      const result = await service.getPrograms();
      expect(result).toEqual(programs);
    });
  });

  // ─── Company Verifications ────────────────────────────────────────────────────

  describe('verifyCompany', () => {
    it('should create a verification record and publish event', async () => {
      const dto = {
        companyId: 'company-1',
        action: VerificationAction.APPROVED,
        newStatus: 'verified',
      };
      const saved = { id: 'verif-1', ...dto, verifiedBy: 'admin-1' };
      verificationRepo.create.mockReturnValue(saved);
      verificationRepo.save.mockResolvedValue(saved);

      const result = await service.verifyCompany('admin-1', dto as any);

      expect(verificationRepo.save).toHaveBeenCalled();
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'admin.company.verified',
        expect.objectContaining({ companyId: 'company-1', action: VerificationAction.APPROVED }),
        'admin-service',
      );
      expect(result.id).toBe('verif-1');
    });
  });

  describe('getCompanyVerifications', () => {
    it('should return paginated verifications', async () => {
      const verifications = [{ id: 'v-1' }];
      verificationRepo.findAndCount.mockResolvedValue([verifications, 1]);

      const result = await service.getCompanyVerifications(undefined, 1, 20);

      expect(result.data).toEqual(verifications);
      expect(result.total).toBe(1);
    });
  });

  // ─── Supervisors ──────────────────────────────────────────────────────────────

  describe('createSupervisor', () => {
    it('should create a supervisor', async () => {
      supervisorRepo.findOne.mockResolvedValue(null);
      const dto = { userId: 'user-1', role: SupervisorRole.FACULTY_SUPERVISOR };
      const saved = { id: 'sup-1', ...dto };
      supervisorRepo.create.mockReturnValue(saved);
      supervisorRepo.save.mockResolvedValue(saved);

      const result = await service.createSupervisor(dto as any);
      expect(result.id).toBe('sup-1');
    });

    it('should throw ConflictException if user already is supervisor', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createSupervisor({ userId: 'user-1', role: SupervisorRole.FACULTY_SUPERVISOR } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('assignSupervisor', () => {
    it('should assign supervisor and increment student count', async () => {
      const supervisor = {
        id: 'sup-1',
        isActive: true,
        currentStudents: 3,
        maxStudents: 10,
      };
      supervisorRepo.findOne.mockResolvedValue(supervisor);
      assignmentRepo.findOne.mockResolvedValue(null);
      const dto = {
        supervisorId: 'sup-1',
        studentId: 'stu-1',
        projectId: 'proj-1',
        applicationId: 'app-1',
        periodId: 'per-1',
        startDate: '2025-02-01',
      };
      const saved = { id: 'asgn-1', ...dto, assignedBy: 'admin-1', status: 'active' };
      assignmentRepo.create.mockReturnValue(saved);
      assignmentRepo.save.mockResolvedValue(saved);
      supervisorRepo.increment.mockResolvedValue(undefined);

      const result = await service.assignSupervisor('admin-1', dto as any);

      expect(supervisorRepo.increment).toHaveBeenCalledWith({ id: 'sup-1' }, 'currentStudents', 1);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'admin.supervisor.assigned',
        expect.objectContaining({ supervisorId: 'sup-1', studentId: 'stu-1', role: AssignmentRole.ASESOR }),
        'admin-service',
      );
      expect(result[0].id).toBe('asgn-1');
      // Marca la aplicación como pending_supervisor (espera aceptación del asesor) —
      // no la avanza a in_progress, eso ocurre solo cuando el asesor acepta.
      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        'application',
        '/internal/applications/app-1/pending-supervisor',
        {},
      );
    });

    it('should NOT start the project/application immediately — only on acceptance', async () => {
      const supervisor = { id: 'sup-1', isActive: true, currentStudents: 3, maxStudents: 10 };
      supervisorRepo.findOne.mockResolvedValue(supervisor);
      assignmentRepo.findOne.mockResolvedValue(null);
      const dto = {
        supervisorId: 'sup-1', studentId: 'stu-1', projectId: 'proj-1',
        applicationId: 'app-1', periodId: 'per-1', startDate: '2025-02-01',
      };
      assignmentRepo.create.mockReturnValue({ id: 'asgn-1', ...dto, status: AssignmentStatus.PENDING_ACCEPTANCE });
      assignmentRepo.save.mockResolvedValue({ id: 'asgn-1', ...dto, status: AssignmentStatus.PENDING_ACCEPTANCE });

      await service.assignSupervisor('admin-1', dto as any);

      // Marca pending_supervisor (esperado), pero nunca llama a un endpoint que
      // avance la aplicación a in_progress — eso solo ocurre en acceptAssignment.
      expect(mockHttpClient.patch).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.patch).not.toHaveBeenCalledWith(
        'application',
        expect.stringContaining('/start'),
        expect.anything(),
      );
    });

    it('should throw BadRequestException if supervisor is not active', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', isActive: false, currentStudents: 0, maxStudents: 10 });

      await expect(
        service.assignSupervisor('admin-1', { supervisorId: 'sup-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if supervisor is at max capacity', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', isActive: true, currentStudents: 10, maxStudents: 10 });

      await expect(
        service.assignSupervisor('admin-1', { supervisorId: 'sup-1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if student already has supervisor for project', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', isActive: true, currentStudents: 2, maxStudents: 10 });
      assignmentRepo.findOne.mockResolvedValue({ id: 'existing' });

      await expect(
        service.assignSupervisor('admin-1', {
          supervisorId: 'sup-1',
          studentId: 'stu-1',
          projectId: 'proj-1',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMySupervisedStudents', () => {
    it('should return empty when user is not a supervisor', async () => {
      supervisorRepo.findOne.mockResolvedValue(null);

      const result = await service.getMySupervisedStudents('user-999');
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return paginated assignments for supervisor', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', userId: 'user-1' });
      const assignments = [{ id: 'asgn-1' }];
      assignmentRepo.findAndCount.mockResolvedValue([assignments, 1]);

      const result = await service.getMySupervisedStudents('user-1');

      expect(result.data).toEqual(assignments);
      expect(result.total).toBe(1);
    });
  });

  // ─── System Settings ──────────────────────────────────────────────────────────

  describe('upsertSetting', () => {
    it('should create new setting', async () => {
      settingRepo.findOne.mockResolvedValue(null);
      const dto = { key: 'max_applications', value: 5 };
      const saved = { id: 's-1', ...dto, updatedBy: 'admin-1' };
      settingRepo.create.mockReturnValue(saved);
      settingRepo.save.mockResolvedValue(saved);

      const result = await service.upsertSetting('admin-1', dto as any);
      expect(result.key).toBe('max_applications');
    });

    it('should update existing setting', async () => {
      const existing = { id: 's-1', key: 'max_applications', value: 5, updatedBy: null };
      settingRepo.findOne.mockResolvedValue(existing);
      settingRepo.save.mockResolvedValue({ ...existing, value: 10, updatedBy: 'admin-1' });

      const result = await service.upsertSetting('admin-1', { key: 'max_applications', value: 10 } as any);
      expect(result.value).toBe(10);
    });
  });

  describe('getSettings', () => {
    it('should return all settings', async () => {
      const settings = [{ id: 's-1', key: 'max_applications' }];
      settingRepo.find.mockResolvedValue(settings);

      const result = await service.getSettings();
      expect(result).toEqual(settings);
    });
  });

  describe('getSettingByKey', () => {
    it('should return setting by key', async () => {
      const setting = { id: 's-1', key: 'max_applications', value: 5 };
      settingRepo.findOne.mockResolvedValue(setting);

      const result = await service.getSettingByKey('max_applications');
      expect(result).toEqual(setting);
    });

    it('should throw NotFoundException if key does not exist', async () => {
      settingRepo.findOne.mockResolvedValue(null);
      await expect(service.getSettingByKey('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMyProfile (onboarding)', () => {
    it('should persist isOnboardingComplete=true once employeeCode/department/role are set (bug fix)', async () => {
      const existing = { userId: 'faculty-1', employeeCode: null, department: null, role: null, isOnboardingComplete: false };
      supervisorRepo.findOne.mockResolvedValue(existing);
      supervisorRepo.save.mockImplementation(async (s: any) => s);

      const result = await service.updateMyProfile('faculty-1', {
        employeeCode: 'EMP-1',
        department: 'Ingeniería',
        role: SupervisorRole.FACULTY_SUPERVISOR,
      } as any);

      expect(result.isOnboardingComplete).toBe(true);
      expect(supervisorRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isOnboardingComplete: true }));
    });

    it('should keep isOnboardingComplete=false if required fields are still missing', async () => {
      const existing = { userId: 'faculty-1', employeeCode: null, department: null, role: null, isOnboardingComplete: false };
      supervisorRepo.findOne.mockResolvedValue(existing);
      supervisorRepo.save.mockImplementation(async (s: any) => s);

      const result = await service.updateMyProfile('faculty-1', { employeeCode: 'EMP-1' } as any);

      expect(result.isOnboardingComplete).toBe(false);
    });
  });

  describe('acceptAssignment / declineAssignment', () => {
    const pendingAsesor = {
      id: 'asgn-1',
      supervisorId: 'sup-1',
      studentId: 'stu-1',
      projectId: 'proj-1',
      applicationId: 'app-1',
      assignedBy: 'admin-1',
      role: AssignmentRole.ASESOR,
      status: AssignmentStatus.PENDING_ACCEPTANCE,
    };

    it('acceptAssignment: should mark accepted and trigger start-progress on application and project', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', userId: 'faculty-1' });
      assignmentRepo.findOne.mockResolvedValue({ ...pendingAsesor });
      assignmentRepo.save.mockImplementation(async (a: any) => a);

      const result = await service.acceptAssignment('asgn-1', 'faculty-1');

      expect(result.status).toBe(AssignmentStatus.ACCEPTED);
      expect(result.acceptedAt).toBeInstanceOf(Date);
      expect(mockHttpClient.patch).toHaveBeenCalledWith('application', '/internal/applications/app-1/start-progress', { supervisorAssignmentId: 'asgn-1' });
      expect(mockHttpClient.patch).toHaveBeenCalledWith('project', '/internal/projects/proj-1/start-progress', {});
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'admin.supervisor.accepted',
        expect.objectContaining({ assignmentId: 'asgn-1' }),
        'admin-service',
      );
    });

    it('acceptAssignment: should reject if role is jurado (jurado auto-accepts, nothing to accept)', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', userId: 'faculty-1' });
      assignmentRepo.findOne.mockResolvedValue({ ...pendingAsesor, role: AssignmentRole.JURADO_ANTEPROYECTO });

      await expect(service.acceptAssignment('asgn-1', 'faculty-1')).rejects.toThrow(BadRequestException);
    });

    it('declineAssignment: should mark declined, decrement supervisor count, and NOT start progress', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', userId: 'faculty-1' });
      assignmentRepo.findOne.mockResolvedValue({ ...pendingAsesor });
      assignmentRepo.save.mockImplementation(async (a: any) => a);

      const result = await service.declineAssignment('asgn-1', 'faculty-1', { reason: 'No tengo disponibilidad' } as any);

      expect(result.status).toBe(AssignmentStatus.DECLINED);
      expect(result.declineReason).toBe('No tengo disponibilidad');
      expect(supervisorRepo.decrement).toHaveBeenCalledWith({ id: 'sup-1' }, 'currentStudents', 1);
      // Revierte la aplicación a accepted (para permitir reasignar), pero nunca
      // llama start-progress — eso solo ocurre en acceptAssignment.
      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        'application',
        '/internal/applications/app-1/revert-accepted',
        {},
      );
      expect(mockHttpClient.patch).not.toHaveBeenCalledWith(
        'application',
        expect.stringContaining('start-progress'),
        expect.anything(),
      );
    });

    it('declineAssignment: jurado cannot decline', async () => {
      supervisorRepo.findOne.mockResolvedValue({ id: 'sup-1', userId: 'faculty-1' });
      assignmentRepo.findOne.mockResolvedValue({ ...pendingAsesor, role: AssignmentRole.JURADO_ANTEPROYECTO });

      await expect(
        service.declineAssignment('asgn-1', 'faculty-1', { reason: 'x' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('academic templates', () => {
    it('createTemplate should save with createdBy', async () => {
      templateRepo.create.mockImplementation((v: any) => v);
      templateRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'tpl-1', ...v }));

      const result = await service.createTemplate('admin-1', {
        programCode: 'sis',
        type: 'anteproyecto' as any,
        name: 'Plantilla',
        fileId: 'file-1',
      } as any);

      expect(templateRepo.save).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'admin-1' }));
      expect(result.id).toBe('tpl-1');
    });

    it('updateTemplate should throw NotFoundException when missing', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTemplate('missing', { name: 'x' } as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('document requirements', () => {
    it('createDocumentRequirement defaults projectTypes to [all]', async () => {
      documentRequirementRepo.create.mockImplementation((v: any) => v);
      documentRequirementRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'req-1', ...v }));

      const result = await service.createDocumentRequirement('admin-1', {
        name: 'Carta',
        actorType: 'student',
        requiredAtStage: 'pre_initiation',
      } as any);

      expect(result.projectTypes).toEqual(['all']);
    });

    it('getDocumentRequirements filters by projectType client-side', async () => {
      documentRequirementRepo.find.mockResolvedValue([
        { id: '1', projectTypes: ['all'] },
        { id: '2', projectTypes: ['thesis'] },
        { id: '3', projectTypes: ['internship'] },
      ]);

      const result = await service.getDocumentRequirements({ projectType: 'thesis' });
      expect(result.map((r) => r.id)).toEqual(['1', '2']);
    });
  });
});

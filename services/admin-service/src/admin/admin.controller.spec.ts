import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard, RolesGuard } from '@collab-u/shared';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PeriodStatus } from './entities/academic-period.entity';
import { VerificationAction } from './entities/company-verification.entity';
import { SupervisorRole } from './entities/supervisor.entity';

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockAdminService = {
  getDashboard: jest.fn(),
  getPeriods: jest.fn(),
  createPeriod: jest.fn(),
  getPeriodById: jest.fn(),
  updatePeriod: jest.fn(),
  getPrograms: jest.fn(),
  createProgram: jest.fn(),
  getProgramById: jest.fn(),
  updateProgram: jest.fn(),
  getCompanyVerifications: jest.fn(),
  verifyCompany: jest.fn(),
  getSupervisors: jest.fn(),
  createSupervisor: jest.fn(),
  assignSupervisor: jest.fn(),
  getMySupervisedStudents: jest.fn(),
  getSettings: jest.fn(),
  upsertSetting: jest.fn(),
  getSettingByKey: jest.fn(),
};

const USER = { id: 'admin-uuid-1' };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should return dashboard stats', async () => {
      const stats = { stats: { totalSupervisors: 5, currentPeriod: '2025-A' } };
      mockAdminService.getDashboard.mockResolvedValue(stats);

      const result = await controller.getDashboard();

      expect(mockAdminService.getDashboard).toHaveBeenCalled();
      expect(result).toEqual(stats);
    });
  });

  describe('getPeriods', () => {
    it('should return paginated periods', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getPeriods.mockResolvedValue(paginated);

      const result = await controller.getPeriods({});

      expect(mockAdminService.getPeriods).toHaveBeenCalledWith({});
      expect(result).toEqual(paginated);
    });
  });

  describe('createPeriod', () => {
    it('should create and return a period', async () => {
      const dto = { name: '2025-A', startDate: '2025-02-01', endDate: '2025-06-30' };
      const created = { id: 'p-1', ...dto, status: PeriodStatus.PLANNING };
      mockAdminService.createPeriod.mockResolvedValue(created);

      const result = await controller.createPeriod(dto as any);

      expect(mockAdminService.createPeriod).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('getPeriodById', () => {
    it('should return period by id', async () => {
      const period = { id: 'p-1', name: '2025-A' };
      mockAdminService.getPeriodById.mockResolvedValue(period);

      const result = await controller.getPeriodById('p-1');

      expect(mockAdminService.getPeriodById).toHaveBeenCalledWith('p-1');
      expect(result).toEqual(period);
    });
  });

  describe('updatePeriod', () => {
    it('should update a period', async () => {
      const updated = { id: 'p-1', name: '2025-A', isCurrent: true };
      mockAdminService.updatePeriod.mockResolvedValue(updated);

      const result = await controller.updatePeriod('p-1', { isCurrent: true });

      expect(mockAdminService.updatePeriod).toHaveBeenCalledWith('p-1', { isCurrent: true });
      expect(result).toEqual(updated);
    });
  });

  describe('getPrograms', () => {
    it('should return programs', async () => {
      const programs = [{ id: 'prog-1', code: 'ISC' }];
      mockAdminService.getPrograms.mockResolvedValue(programs);

      const result = await controller.getPrograms();

      expect(mockAdminService.getPrograms).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(programs);
    });
  });

  describe('createProgram', () => {
    it('should create a program', async () => {
      const dto = { name: 'Ingeniería de Sistemas', code: 'ISC' };
      const created = { id: 'prog-1', ...dto };
      mockAdminService.createProgram.mockResolvedValue(created);

      const result = await controller.createProgram(dto as any);

      expect(mockAdminService.createProgram).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('getCompanyVerifications', () => {
    it('should return paginated verifications', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getCompanyVerifications.mockResolvedValue(paginated);

      const result = await controller.getCompanyVerifications();

      expect(mockAdminService.getCompanyVerifications).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(result).toEqual(paginated);
    });
  });

  describe('verifyCompany', () => {
    it('should verify a company', async () => {
      const dto = { companyId: 'company-1', action: VerificationAction.APPROVED };
      const verification = { id: 'v-1', ...dto, verifiedBy: USER.id };
      mockAdminService.verifyCompany.mockResolvedValue(verification);

      const result = await controller.verifyCompany(USER, 'company-1', dto as any);

      expect(mockAdminService.verifyCompany).toHaveBeenCalledWith(USER.id, { ...dto, companyId: 'company-1' });
      expect(result).toEqual(verification);
    });
  });

  describe('createSupervisor', () => {
    it('should create a supervisor', async () => {
      const dto = { userId: 'user-1', role: SupervisorRole.FACULTY_SUPERVISOR };
      const created = { id: 'sup-1', ...dto };
      mockAdminService.createSupervisor.mockResolvedValue(created);

      const result = await controller.createSupervisor(dto as any);

      expect(mockAdminService.createSupervisor).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });
  });

  describe('assignSupervisor', () => {
    it('should assign a supervisor', async () => {
      const dto = {
        supervisorId: 'sup-1',
        studentId: 'stu-1',
        projectId: 'proj-1',
        applicationId: 'app-1',
        periodId: 'per-1',
        startDate: '2025-02-01',
      };
      const assignment = { id: 'asgn-1', ...dto, assignedBy: USER.id };
      mockAdminService.assignSupervisor.mockResolvedValue(assignment);

      const result = await controller.assignSupervisor(USER, dto as any);

      expect(mockAdminService.assignSupervisor).toHaveBeenCalledWith(USER.id, dto);
      expect(result).toEqual(assignment);
    });
  });

  describe('getMySupervisedStudents', () => {
    it('should return supervised students for faculty user', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      mockAdminService.getMySupervisedStudents.mockResolvedValue(paginated);

      const result = await controller.getMySupervisedStudents(USER);

      expect(mockAdminService.getMySupervisedStudents).toHaveBeenCalledWith(
        USER.id,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(paginated);
    });
  });

  describe('upsertSetting', () => {
    it('should upsert a system setting', async () => {
      const dto = { key: 'max_applications', value: 5 };
      const saved = { id: 's-1', ...dto, updatedBy: USER.id };
      mockAdminService.upsertSetting.mockResolvedValue(saved);

      const result = await controller.upsertSetting(USER, dto as any);

      expect(mockAdminService.upsertSetting).toHaveBeenCalledWith(USER.id, dto);
      expect(result).toEqual(saved);
    });
  });

  describe('getSettings', () => {
    it('should return settings', async () => {
      const settings = [{ id: 's-1', key: 'max_applications' }];
      mockAdminService.getSettings.mockResolvedValue(settings);

      const result = await controller.getSettings();

      expect(mockAdminService.getSettings).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(settings);
    });
  });

  describe('getSettingByKey', () => {
    it('should return setting by key', async () => {
      const setting = { id: 's-1', key: 'max_applications', value: 5 };
      mockAdminService.getSettingByKey.mockResolvedValue(setting);

      const result = await controller.getSettingByKey('max_applications');

      expect(mockAdminService.getSettingByKey).toHaveBeenCalledWith('max_applications');
      expect(result).toEqual(setting);
    });
  });
});

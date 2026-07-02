import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventPublisher } from '@collab-u/shared';

import { AdminService } from './admin.service';
import { AcademicPeriod, PeriodStatus } from './entities/academic-period.entity';
import { AcademicProgram } from './entities/academic-program.entity';
import { CompanyVerification, VerificationAction } from './entities/company-verification.entity';
import { Supervisor, SupervisorRole } from './entities/supervisor.entity';
import { SupervisorAssignment } from './entities/supervisor-assignment.entity';
import { SystemSetting } from './entities/system-setting.entity';

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
});

const mockEventPublisher = { publish: jest.fn() };

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let periodRepo: ReturnType<typeof repoMock>;
  let programRepo: ReturnType<typeof repoMock>;
  let verificationRepo: ReturnType<typeof repoMock>;
  let supervisorRepo: ReturnType<typeof repoMock>;
  let assignmentRepo: ReturnType<typeof repoMock>;
  let settingRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    periodRepo = repoMock();
    programRepo = repoMock();
    verificationRepo = repoMock();
    supervisorRepo = repoMock();
    assignmentRepo = repoMock();
    settingRepo = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(AcademicPeriod), useValue: periodRepo },
        { provide: getRepositoryToken(AcademicProgram), useValue: programRepo },
        { provide: getRepositoryToken(CompanyVerification), useValue: verificationRepo },
        { provide: getRepositoryToken(Supervisor), useValue: supervisorRepo },
        { provide: getRepositoryToken(SupervisorAssignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(SystemSetting), useValue: settingRepo },
        { provide: EventPublisher, useValue: mockEventPublisher },
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
        expect.objectContaining({ supervisorId: 'sup-1', studentId: 'stu-1' }),
        'admin-service',
      );
      expect(result.id).toBe('asgn-1');
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
});

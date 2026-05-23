import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher } from '@collab-u/shared';

import { AnalyticsService } from './analytics.service';
import { ProjectMetrics } from './entities/project-metrics.entity';
import { StudentMetrics } from './entities/student-metrics.entity';
import { CompanyMetrics } from './entities/company-metrics.entity';
import { PlatformMetrics } from './entities/platform-metrics.entity';
import { SkillTrend } from './entities/skill-trend.entity';
import { Report } from './entities/report.entity';

// ─── Repository mock factory ─────────────────────────────────────────────────

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

// ─── Fixtures ────────────────────────────────────────────────────────────────

const today = new Date();
today.setHours(0, 0, 0, 0);

const projectId = '11111111-1111-1111-1111-111111111111';
const studentId = '22222222-2222-2222-2222-222222222222';
const companyId = '33333333-3333-3333-3333-333333333333';
const userId    = '44444444-4444-4444-4444-444444444444';

const mockPlatformMetrics: Partial<PlatformMetrics> = {
  id: 'pm-1',
  totalUsers: 100,
  totalStudents: 60,
  totalCompanies: 30,
  totalProjects: 50,
  activeProjects: 20,
  totalApplications: 200,
  avgMatchScore: 78.5,
  newUsersPeriod: 10,
  newProjectsPeriod: 5,
  snapshotDate: today,
};

const mockProjectMetrics: Partial<ProjectMetrics> = {
  id: 'proj-m-1',
  projectId,
  totalApplications: 15,
  acceptedApplications: 3,
  rejectedApplications: 8,
  avgMatchScore: 72.3,
  snapshotDate: today,
};

const mockStudentMetrics: Partial<StudentMetrics> = {
  id: 'stud-m-1',
  studentId,
  totalApplications: 5,
  acceptedCount: 1,
  rejectedCount: 2,
  avgMatchScore: 80.0,
  profileCompleteness: 90,
  snapshotDate: today,
};

const mockCompanyMetrics: Partial<CompanyMetrics> = {
  id: 'comp-m-1',
  companyId,
  totalProjects: 10,
  activeProjects: 4,
  totalApplicationsReceived: 80,
  totalStudentsHired: 5,
  snapshotDate: today,
};

const mockSkillTrend: Partial<SkillTrend> = {
  id: 'skill-1',
  skillName: 'TypeScript',
  demandCount: 40,
  supplyCount: 25,
  gapIndex: 15.0,
  trendDirection: 'rising',
  snapshotDate: today,
};

const mockReport: Partial<Report> = {
  id: 'report-1',
  name: 'Resumen 2025-A',
  reportType: 'period_summary',
  generatedBy: userId,
  data: { generatedAt: new Date() },
  status: 'completed',
  createdAt: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let projectMetricsRepo: ReturnType<typeof repoMock>;
  let studentMetricsRepo: ReturnType<typeof repoMock>;
  let companyMetricsRepo: ReturnType<typeof repoMock>;
  let platformMetricsRepo: ReturnType<typeof repoMock>;
  let skillTrendRepo: ReturnType<typeof repoMock>;
  let reportRepo: ReturnType<typeof repoMock>;

  beforeEach(async () => {
    projectMetricsRepo  = repoMock();
    studentMetricsRepo  = repoMock();
    companyMetricsRepo  = repoMock();
    platformMetricsRepo = repoMock();
    skillTrendRepo      = repoMock();
    reportRepo          = repoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(ProjectMetrics),  useValue: projectMetricsRepo },
        { provide: getRepositoryToken(StudentMetrics),  useValue: studentMetricsRepo },
        { provide: getRepositoryToken(CompanyMetrics),  useValue: companyMetricsRepo },
        { provide: getRepositoryToken(PlatformMetrics), useValue: platformMetricsRepo },
        { provide: getRepositoryToken(SkillTrend),      useValue: skillTrendRepo },
        { provide: getRepositoryToken(Report),          useValue: reportRepo },
        { provide: EventPublisher,                      useValue: mockEventPublisher },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('should return dashboard with platform metrics, top skills and recent reports', async () => {
      platformMetricsRepo.findOne.mockResolvedValue(mockPlatformMetrics);
      skillTrendRepo.find.mockResolvedValue([mockSkillTrend]);
      reportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.getDashboard();

      expect(result.platformMetrics.totalUsers).toBe(100);
      expect(result.platformMetrics.totalStudents).toBe(60);
      expect(result.platformMetrics.activeProjects).toBe(20);
      expect(result.topSkills).toHaveLength(1);
      expect(result.topSkills[0].name).toBe('TypeScript');
      expect(result.recentReports).toHaveLength(1);
    });

    it('should return zeros when no platform metrics exist', async () => {
      platformMetricsRepo.findOne.mockResolvedValue(null);
      skillTrendRepo.find.mockResolvedValue([]);
      reportRepo.find.mockResolvedValue([]);

      const result = await service.getDashboard();

      expect(result.platformMetrics.totalUsers).toBe(0);
      expect(result.platformMetrics.avgMatchScore).toBeNull();
    });
  });

  // ─── Platform Metrics ────────────────────────────────────────────────────────

  describe('getPlatformMetrics', () => {
    it('should return list of platform metrics', async () => {
      platformMetricsRepo.find.mockResolvedValue([mockPlatformMetrics]);

      const result = await service.getPlatformMetrics({});

      expect(result).toHaveLength(1);
      expect(result[0].totalUsers).toBe(100);
    });
  });

  describe('recordPlatformSnapshot', () => {
    it('should update existing snapshot for today', async () => {
      const existing = { ...mockPlatformMetrics };
      platformMetricsRepo.findOne.mockResolvedValue(existing);
      platformMetricsRepo.save.mockResolvedValue({ ...existing, totalUsers: 110 });

      const result = await service.recordPlatformSnapshot({ totalUsers: 110 });

      expect(platformMetricsRepo.save).toHaveBeenCalledTimes(1);
      expect(result.totalUsers).toBe(110);
    });

    it('should create new snapshot if none exists for today', async () => {
      platformMetricsRepo.findOne.mockResolvedValue(null);
      platformMetricsRepo.create.mockReturnValue(mockPlatformMetrics);
      platformMetricsRepo.save.mockResolvedValue(mockPlatformMetrics);

      await service.recordPlatformSnapshot({ totalUsers: 100 });

      expect(platformMetricsRepo.create).toHaveBeenCalledTimes(1);
      expect(platformMetricsRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Project Metrics ─────────────────────────────────────────────────────────

  describe('getProjectMetrics', () => {
    it('should return metrics list for a project', async () => {
      projectMetricsRepo.find.mockResolvedValue([mockProjectMetrics]);

      const result = await service.getProjectMetrics(projectId, {});

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBe(projectId);
    });
  });

  describe('getProjectMetricsSummary', () => {
    it('should return latest snapshot', async () => {
      projectMetricsRepo.findOne.mockResolvedValue(mockProjectMetrics);

      const result = await service.getProjectMetricsSummary(projectId);

      expect(result.totalApplications).toBe(15);
    });

    it('should throw NotFoundException if no metrics exist', async () => {
      projectMetricsRepo.findOne.mockResolvedValue(null);

      await expect(service.getProjectMetricsSummary(projectId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertProjectMetrics', () => {
    it('should update existing snapshot for today', async () => {
      const existing = { ...mockProjectMetrics };
      projectMetricsRepo.findOne.mockResolvedValue(existing);
      projectMetricsRepo.save.mockResolvedValue({ ...existing, totalApplications: 20 });

      const result = await service.upsertProjectMetrics(projectId, { totalApplications: 20 });

      expect(projectMetricsRepo.create).not.toHaveBeenCalled();
      expect(result.totalApplications).toBe(20);
    });

    it('should create new snapshot if none exists today', async () => {
      projectMetricsRepo.findOne.mockResolvedValue(null);
      projectMetricsRepo.create.mockReturnValue(mockProjectMetrics);
      projectMetricsRepo.save.mockResolvedValue(mockProjectMetrics);

      await service.upsertProjectMetrics(projectId, { totalApplications: 15 });

      expect(projectMetricsRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Student Metrics ─────────────────────────────────────────────────────────

  describe('getStudentMetrics', () => {
    it('should return metrics list for a student', async () => {
      studentMetricsRepo.find.mockResolvedValue([mockStudentMetrics]);

      const result = await service.getStudentMetrics(studentId, {});

      expect(result).toHaveLength(1);
      expect(result[0].studentId).toBe(studentId);
    });
  });

  describe('getStudentMetricsSummary', () => {
    it('should return latest student snapshot', async () => {
      studentMetricsRepo.findOne.mockResolvedValue(mockStudentMetrics);

      const result = await service.getStudentMetricsSummary(studentId);

      expect(result.profileCompleteness).toBe(90);
    });

    it('should throw NotFoundException if no metrics', async () => {
      studentMetricsRepo.findOne.mockResolvedValue(null);

      await expect(service.getStudentMetricsSummary(studentId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertStudentMetrics', () => {
    it('should create new snapshot when none exists', async () => {
      studentMetricsRepo.findOne.mockResolvedValue(null);
      studentMetricsRepo.create.mockReturnValue(mockStudentMetrics);
      studentMetricsRepo.save.mockResolvedValue(mockStudentMetrics);

      await service.upsertStudentMetrics(studentId, { totalApplications: 5 });

      expect(studentMetricsRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should update existing snapshot when found', async () => {
      const existing = { ...mockStudentMetrics };
      studentMetricsRepo.findOne.mockResolvedValue(existing);
      studentMetricsRepo.save.mockResolvedValue({ ...existing, totalApplications: 6 });

      const result = await service.upsertStudentMetrics(studentId, { totalApplications: 6 });

      expect(studentMetricsRepo.create).not.toHaveBeenCalled();
      expect(result.totalApplications).toBe(6);
    });
  });

  // ─── Company Metrics ─────────────────────────────────────────────────────────

  describe('getCompanyMetrics', () => {
    it('should return metrics list for a company', async () => {
      companyMetricsRepo.find.mockResolvedValue([mockCompanyMetrics]);

      const result = await service.getCompanyMetrics(companyId, {});

      expect(result).toHaveLength(1);
      expect(result[0].companyId).toBe(companyId);
    });
  });

  describe('getCompanyMetricsSummary', () => {
    it('should return latest company snapshot', async () => {
      companyMetricsRepo.findOne.mockResolvedValue(mockCompanyMetrics);

      const result = await service.getCompanyMetricsSummary(companyId);

      expect(result.totalStudentsHired).toBe(5);
    });

    it('should throw NotFoundException if no metrics', async () => {
      companyMetricsRepo.findOne.mockResolvedValue(null);

      await expect(service.getCompanyMetricsSummary(companyId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('upsertCompanyMetrics', () => {
    it('should create new snapshot when none exists', async () => {
      companyMetricsRepo.findOne.mockResolvedValue(null);
      companyMetricsRepo.create.mockReturnValue(mockCompanyMetrics);
      companyMetricsRepo.save.mockResolvedValue(mockCompanyMetrics);

      await service.upsertCompanyMetrics(companyId, { totalProjects: 10 });

      expect(companyMetricsRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Skill Trends ────────────────────────────────────────────────────────────

  describe('getSkillTrends', () => {
    it('should return skill trends list', async () => {
      skillTrendRepo.find.mockResolvedValue([mockSkillTrend]);

      const result = await service.getSkillTrends({});

      expect(result).toHaveLength(1);
      expect(result[0].skillName).toBe('TypeScript');
    });
  });

  describe('getTopDemandedSkills', () => {
    it('should return top N skills by demand', async () => {
      skillTrendRepo.find.mockResolvedValue([mockSkillTrend]);

      const result = await service.getTopDemandedSkills(5);

      expect(result).toHaveLength(1);
      expect(skillTrendRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('upsertSkillTrend', () => {
    it('should create new trend when none exists today', async () => {
      skillTrendRepo.findOne.mockResolvedValue(null);
      skillTrendRepo.create.mockReturnValue(mockSkillTrend);
      skillTrendRepo.save.mockResolvedValue(mockSkillTrend);

      await service.upsertSkillTrend('TypeScript', { demandCount: 40 });

      expect(skillTrendRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should update existing trend for today', async () => {
      const existing = { ...mockSkillTrend };
      skillTrendRepo.findOne.mockResolvedValue(existing);
      skillTrendRepo.save.mockResolvedValue({ ...existing, demandCount: 45 });

      const result = await service.upsertSkillTrend('TypeScript', { demandCount: 45 });

      expect(skillTrendRepo.create).not.toHaveBeenCalled();
      expect(result.demandCount).toBe(45);
    });
  });

  // ─── Reports ─────────────────────────────────────────────────────────────────

  describe('generateReport', () => {
    it('should generate a period_summary report and publish event', async () => {
      platformMetricsRepo.find.mockResolvedValue([mockPlatformMetrics]);
      skillTrendRepo.find.mockResolvedValue([mockSkillTrend]);
      reportRepo.create.mockReturnValue(mockReport);
      reportRepo.save.mockResolvedValue(mockReport);

      const dto = { name: 'Resumen 2025-A', reportType: 'period_summary' };
      const result = await service.generateReport(userId, dto);

      expect(reportRepo.create).toHaveBeenCalledTimes(1);
      expect(reportRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publish).toHaveBeenCalledWith(
        'analytics.report.generated',
        expect.objectContaining({ reportType: 'period_summary' }),
        'analytics-service',
      );
      expect(result.name).toBe('Resumen 2025-A');
    });

    it('should generate a skill_gap_analysis report', async () => {
      skillTrendRepo.find.mockResolvedValue([mockSkillTrend]);
      reportRepo.create.mockReturnValue({ ...mockReport, reportType: 'skill_gap_analysis' });
      reportRepo.save.mockResolvedValue({ ...mockReport, reportType: 'skill_gap_analysis' });

      const dto = { name: 'Gap Skills', reportType: 'skill_gap_analysis' };
      await service.generateReport(userId, dto);

      expect(reportRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should generate a custom report with provided parameters', async () => {
      reportRepo.create.mockReturnValue({ ...mockReport, reportType: 'custom' });
      reportRepo.save.mockResolvedValue({ ...mockReport, reportType: 'custom' });

      const dto = {
        name: 'Custom Report',
        reportType: 'custom',
        parameters: { filter: 'test' },
      };
      await service.generateReport(userId, dto);

      expect(reportRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ reportType: 'custom' }),
      );
    });
  });

  describe('getReports', () => {
    it('should return list of reports', async () => {
      reportRepo.find.mockResolvedValue([mockReport]);

      const result = await service.getReports({});

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Resumen 2025-A');
    });
  });

  describe('getReport', () => {
    it('should return report by id', async () => {
      reportRepo.findOne.mockResolvedValue(mockReport);

      const result = await service.getReport('report-1');

      expect(result.id).toBe('report-1');
    });

    it('should throw NotFoundException if report not found', async () => {
      reportRepo.findOne.mockResolvedValue(null);

      await expect(service.getReport('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

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
const mockHttpClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };

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
        { provide: MicroserviceHttpClient,               useValue: mockHttpClient },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    jest.clearAllMocks();
    // Default: cualquier llamada a un endpoint interno no mockeada explícitamente por un test
    // resuelve a null (equivalente a "servicio fuente no disponible") — el servicio ya maneja
    // ese caso con fallback a datos persistidos/0/null, nunca lanza. Los tests que necesiten un
    // valor específico lo sobreescriben con mockResolvedValueOnce/mockImplementation.
    mockHttpClient.get.mockResolvedValue(null);
    mockHttpClient.post.mockResolvedValue([]);
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('should return dashboard with platform metrics, top skills and recent reports', async () => {
      platformMetricsRepo.find.mockResolvedValue([mockPlatformMetrics]);
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
      platformMetricsRepo.find.mockResolvedValue([]);
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

    it('should return an empty list when no historical snapshots exist yet', async () => {
      platformMetricsRepo.find.mockResolvedValue([]);

      const result = await service.getPlatformMetrics({});

      expect(result).toEqual([]);
    });

    it('should apply a from/to date-range filter via buildDateRange', async () => {
      platformMetricsRepo.find.mockResolvedValue([mockPlatformMetrics]);

      await service.getPlatformMetrics({ from: '2026-01-01', to: '2026-01-31' });

      expect(platformMetricsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ snapshotDate: expect.anything() }),
        }),
      );
    });

    it('should apply an open-ended "from" filter when only from is given', async () => {
      platformMetricsRepo.find.mockResolvedValue([]);

      await service.getPlatformMetrics({ from: '2026-01-01' });

      const callArg = platformMetricsRepo.find.mock.calls[0][0];
      expect(callArg.where.snapshotDate).toBeDefined();
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

    it('should persist against an explicit historical snapshotDate when provided (FASE 5 backfill)', async () => {
      platformMetricsRepo.findOne.mockResolvedValue(null);
      platformMetricsRepo.create.mockImplementation((v: any) => v);
      platformMetricsRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      const historicalDate = new Date('2025-11-30T00:00:00.000Z');
      await service.recordPlatformSnapshot({ totalUsers: 5 }, historicalDate);

      expect(platformMetricsRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ snapshotDate: historicalDate }) }),
      );
      expect(platformMetricsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalUsers: 5, snapshotDate: historicalDate }),
      );
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
    it('should return latest snapshot merged with on-demand application stats', async () => {
      projectMetricsRepo.find.mockResolvedValue([mockProjectMetrics]);
      mockHttpClient.get.mockImplementation((service: string, path: string) => {
        if (service === 'application') {
          return Promise.resolve({
            total: 15,
            byStatus: { completed: 3 },
            avgTimeToDecisionHours: 12,
            acceptedCount: 3,
            rejectedCount: 8,
          });
        }
        return Promise.resolve(null);
      });

      const result = await service.getProjectMetricsSummary(projectId);

      expect(result.totalApplications).toBe(15);
    });

    it('should fall back to stored snapshot when the source endpoint is unreachable', async () => {
      projectMetricsRepo.find.mockResolvedValue([mockProjectMetrics]);
      mockHttpClient.get.mockResolvedValue(null);

      const result = await service.getProjectMetricsSummary(projectId);

      expect(result.totalApplications).toBe(15);
    });

    it('should throw NotFoundException if no metrics exist anywhere', async () => {
      projectMetricsRepo.find.mockResolvedValue([]);
      mockHttpClient.get.mockResolvedValue(null);

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
    it('should return latest student snapshot (profileCompleteness has no per-student live source yet)', async () => {
      studentMetricsRepo.find.mockResolvedValue([mockStudentMetrics]);
      mockHttpClient.get.mockResolvedValue(null);

      const result = await service.getStudentMetricsSummary(studentId);

      expect(result.profileCompleteness).toBe(90);
    });

    it('should throw NotFoundException if no metrics anywhere', async () => {
      studentMetricsRepo.find.mockResolvedValue([]);
      mockHttpClient.get.mockResolvedValue(null);

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
    it('should return latest company snapshot merged with live project stats', async () => {
      companyMetricsRepo.find.mockResolvedValue([mockCompanyMetrics]);
      mockHttpClient.get.mockResolvedValue(null);

      const result = await service.getCompanyMetricsSummary(companyId);

      expect(result.totalStudentsHired).toBe(5);
    });

    it('should throw NotFoundException if no metrics anywhere', async () => {
      companyMetricsRepo.find.mockResolvedValue([]);
      mockHttpClient.get.mockResolvedValue(null);

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

  describe('getAcademicKpis', () => {
    it('should return stats from admin and application services', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ totalAssignments: 5, byRole: { asesor: 3 }, byStatus: {}, avgAcceptanceHours: 2.5, supervisorWorkload: [] })
        .mockResolvedValueOnce({ totalRecords: 4, byStatus: {}, completedCount: 2, avgDurationDays: 30, avgAnteproyectoCorrections: 1 });

      const [assignmentStats, academicStats] = await service.getAcademicKpis();

      expect(assignmentStats?.totalAssignments).toBe(5);
      expect(academicStats?.completedCount).toBe(2);
    });

    it('should return null for a source that fails without throwing', async () => {
      mockHttpClient.get
        .mockRejectedValueOnce(new Error('down'))
        .mockResolvedValueOnce({ totalRecords: 0, byStatus: {}, completedCount: 0, avgDurationDays: null, avgAnteproyectoCorrections: null });

      const [assignmentStats, academicStats] = await service.getAcademicKpis();

      expect(assignmentStats).toBeNull();
      expect(academicStats?.totalRecords).toBe(0);
    });
  });

  describe('generateReport - academic report types', () => {
    beforeEach(() => {
      reportRepo.create.mockImplementation((v: any) => v);
      reportRepo.save.mockImplementation((v: any) => Promise.resolve({ id: 'report-x', ...v }));
    });

    it('project_completion_rates computes completionRate percentage', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ totalAssignments: 0, byRole: {}, byStatus: {}, avgAcceptanceHours: null, supervisorWorkload: [] })
        .mockResolvedValueOnce({ totalRecords: 4, byStatus: { completed: 2, active: 2 }, completedCount: 2, avgDurationDays: 20, avgAnteproyectoCorrections: 0.5 });

      const report = await service.generateReport(userId, {
        name: 'Completitud', reportType: 'project_completion_rates',
      } as any);

      expect(report.data.completionRate).toBe(50);
      expect(report.data.totalRecords).toBe(4);
    });

    it('supervisor_workload returns assignment stats', async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ totalAssignments: 7, byRole: { asesor: 4 }, byStatus: {}, avgAcceptanceHours: 3, supervisorWorkload: [{ supervisorId: 's1', activeCount: 2 }] })
        .mockResolvedValueOnce({ totalRecords: 0, byStatus: {}, completedCount: 0, avgDurationDays: null, avgAnteproyectoCorrections: null });

      const report = await service.generateReport(userId, {
        name: 'Carga docente', reportType: 'supervisor_workload',
      } as any);

      expect(report.data.totalAssignments).toBe(7);
      expect(report.data.supervisorWorkload).toEqual([{ supervisorId: 's1', activeCount: 2 }]);
    });

    it('company_performance requires entityId and rejects a platform-wide call', async () => {
      const report = await service.generateReport(userId, {
        name: 'Desempeño sin entidad', reportType: 'company_performance',
      } as any);

      expect(report.status).toBe('failed');
      expect(report.data.error).toContain('entityId');
    });

    it('company_performance builds a single-company report via the two-hop project→application/evaluation join', async () => {
      const companyId = 'company-1';
      mockHttpClient.get.mockImplementation((service: string, path: string) => {
        if (service === 'company' && path.includes('basic-info')) {
          return Promise.resolve({ companyName: 'InnovaSoft SAS', industry: 'Tecnología' });
        }
        if (service === 'project' && path.includes('/company/')) return Promise.resolve(['p1', 'p2']);
        if (service === 'project' && path.includes('analytics/stats')) {
          return Promise.resolve({ totalCreated: 5, byStatus: { completed: 2 }, activeCount: 2, avgTimeToFillDays: null });
        }
        if (service === 'application') {
          if (path.includes('projectId=p1')) return Promise.resolve({ total: 3, byStatus: {}, avgTimeToDecisionHours: null, acceptedCount: 2, rejectedCount: 1 });
          if (path.includes('projectId=p2')) return Promise.resolve({ total: 2, byStatus: {}, avgTimeToDecisionHours: null, acceptedCount: 1, rejectedCount: 0 });
        }
        if (service === 'evaluation') {
          if (path.includes('projectId=p1')) return Promise.resolve({ avgOverallScore: 4.0, count: 2, byEvaluationType: {} });
          if (path.includes('projectId=p2')) return Promise.resolve({ avgOverallScore: null, count: 0, byEvaluationType: {} });
        }
        return Promise.resolve(null);
      });

      const report = await service.generateReport(userId, {
        name: 'Desempeño InnovaSoft', reportType: 'company_performance', entityId: companyId,
      } as any);

      expect(report.status).toBe('completed');
      expect(report.data.scope).toBe('company');
      expect(report.data.companyName).toBe('InnovaSoft SAS');
      expect(report.data.totalApplicationsReceived).toBe(5); // 3 + 2
      expect(report.data.acceptedCount).toBe(3); // 2 + 1
      expect(report.data.conversionRate).toBe(60); // 3/5
      expect(report.data.avgEvaluationReceived).toBe(4);
    });

    it('student_outcomes requires entityId', async () => {
      const report = await service.generateReport(userId, {
        name: 'Resultados sin entidad', reportType: 'student_outcomes',
      } as any);

      expect(report.status).toBe('failed');
      expect(report.data.error).toContain('entityId');
    });

    it('student_outcomes computes placement rate and received-evaluation average for one student', async () => {
      mockHttpClient.get.mockImplementation((service: string, path: string) => {
        if (service === 'application') {
          return Promise.resolve({
            total: 20,
            byStatus: { completed: 5 },
            avgTimeToDecisionHours: 40,
            acceptedCount: 12,
            rejectedCount: 3,
          });
        }
        if (service === 'evaluation') {
          return Promise.resolve({
            avgOverallScore: 4.2,
            count: 10,
            byEvaluationType: {
              company_evaluates_student: { avg: 4.0, count: 6 },
              supervisor_evaluates_student: { avg: 4.5, count: 4 },
            },
          });
        }
        if (service === 'student' && path.includes('matching-data')) {
          return Promise.resolve({ program: 'Ingeniería de Sistemas', skills: [{ name: 'sql' }, { name: 'react' }] });
        }
        return Promise.resolve(null);
      });
      mockHttpClient.post.mockResolvedValue([{ userId: 'student-1', firstName: 'Camila', lastName: 'Ortega' }]);

      const report = await service.generateReport(userId, {
        name: 'Resultados estudiante', reportType: 'student_outcomes', entityId: 'student-1',
      } as any);

      expect(report.data.scope).toBe('student');
      expect(report.data.studentName).toBe('Camila Ortega');
      expect(report.data.program).toBe('Ingeniería de Sistemas');
      expect(report.data.skillsCount).toBe(2);
      expect(report.data.placementRate).toBe(25);
      // (4.0*6 + 4.5*4) / 10 = 4.2
      expect(report.data.avgEvaluationReceived).toBe(4.2);
    });

    it('supervisor_report requires entityId', async () => {
      const report = await service.generateReport(userId, {
        name: 'Carga sin entidad', reportType: 'supervisor_report',
      } as any);

      expect(report.status).toBe('failed');
      expect(report.data.error).toContain('entityId');
    });

    it('supervisor_report lists a faculty member\'s active assignments with resolved names', async () => {
      mockHttpClient.get.mockImplementation((service: string, path: string) => {
        if (service === 'admin' && path.includes('/assignments')) {
          return Promise.resolve([
            { id: 'a1', studentId: 'student-1', projectId: 'p1', role: 'asesor', status: 'active', acceptedAt: '2026-01-01' },
            { id: 'a2', studentId: 'student-2', projectId: 'p2', role: 'jurado_anteproyecto', status: 'completed', acceptedAt: '2026-02-01' },
          ]);
        }
        if (service === 'admin') return Promise.resolve({ userId: 'faculty-user-1', department: 'Sistemas', role: 'thesis_advisor' });
        return Promise.resolve(null);
      });
      mockHttpClient.post.mockImplementation((service: string, path: string) => {
        if (service === 'user') return Promise.resolve([
          { userId: 'faculty-user-1', firstName: 'Ana', lastName: 'Ruiz' },
          { userId: 'student-1', firstName: 'Camila', lastName: 'Ortega' },
          { userId: 'student-2', firstName: 'Julián', lastName: 'Restrepo' },
        ]);
        if (service === 'project') return Promise.resolve([
          { id: 'p1', title: 'Plataforma de Analítica' },
          { id: 'p2', title: 'Dashboard de KPIs' },
        ]);
        return Promise.resolve([]);
      });

      const report = await service.generateReport(userId, {
        name: 'Carga Ana Ruiz', reportType: 'supervisor_report', entityId: 'supervisor-1',
      } as any);

      expect(report.status).toBe('completed');
      expect(report.data.scope).toBe('supervisor');
      expect(report.data.totalAssignments).toBe(2);
      expect(report.data.activeAssignments).toBe(1);
      expect(report.data.assignments[0].studentName).toBe('Camila Ortega');
      expect(report.data.assignments[0].projectTitle).toBe('Plataforma de Analítica');
    });

    it('marks the report as failed (not fabricated data) when buildReportData throws', async () => {
      platformMetricsRepo.find.mockRejectedValue(new Error('DB down'));

      const report = await service.generateReport(userId, {
        name: 'Resumen roto', reportType: 'period_summary',
      } as any);

      expect(report.status).toBe('failed');
      expect(report.data.error).toContain('DB down');
      expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    });
  });

  // ─── Agregación diaria (cron) ─────────────────────────────────────────────────

  describe('runDailyAggregation', () => {
    it('persists a platform snapshot and skill trends computed from real source stats', async () => {
      mockHttpClient.get.mockImplementation((service: string, path: string) => {
        if (service === 'project' && path.includes('skills/demand')) {
          return Promise.resolve({
            'skill-uuid-1': { demandCount: 10, category: 'framework', name: 'Angular' },
          });
        }
        if (service === 'project') return Promise.resolve({ totalCreated: 19, byStatus: {}, activeCount: 8, avgTimeToFillDays: null });
        if (service === 'student' && path.includes('skills/supply')) {
          return Promise.resolve({
            'skill-uuid-1': { supplyCount: 4, avgProficiencyLevel: 2.5, category: 'framework', name: 'Angular' },
          });
        }
        if (service === 'student') return Promise.resolve({ totalCreated: 20, avgProfileCompleteness: 70 });
        if (service === 'company') return Promise.resolve({ totalCreated: 3, totalActive: 3 });
        if (service === 'application') return Promise.resolve({ total: 87, byStatus: {}, avgTimeToDecisionHours: 10, acceptedCount: 28, rejectedCount: 3 });
        if (service === 'matching') return Promise.resolve({ avgOverallScore: 76.4, count: 40 });
        return Promise.resolve(null);
      });
      platformMetricsRepo.findOne.mockResolvedValue(null);
      platformMetricsRepo.create.mockImplementation((v: any) => v);
      platformMetricsRepo.save.mockImplementation((v: any) => Promise.resolve(v));
      skillTrendRepo.findOne.mockResolvedValue(null);
      skillTrendRepo.create.mockImplementation((v: any) => v);
      skillTrendRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      await service.runDailyAggregation();

      expect(platformMetricsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          totalStudents: 20,
          totalCompanies: 3,
          totalProjects: 19,
          totalApplications: 87,
          avgMatchScore: 76.4,
        }),
      );
      expect(skillTrendRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ skillName: 'Angular', demandCount: 10, supplyCount: 4, gapIndex: 6 }),
      );
    });

    it('does not throw when every source endpoint is unreachable', async () => {
      mockHttpClient.get.mockResolvedValue(null);
      platformMetricsRepo.findOne.mockResolvedValue(null);
      platformMetricsRepo.create.mockImplementation((v: any) => v);
      platformMetricsRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      await expect(service.runDailyAggregation()).resolves.toBeUndefined();
      expect(platformMetricsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ totalStudents: 0, totalCompanies: 0, totalProjects: 0 }),
      );
    });
  });

  // ─── Backfill histórico (FASE 5) ────────────────────────────────────────────────

  describe('runHistoricalAggregation', () => {
    it('writes one platform_metrics row per date using "to"-bounded acumulativo stats, leaving puntual fields unset', async () => {
      mockHttpClient.get.mockImplementation((service: string, path: string) => {
        if (path.includes('to=2025-10-31') && service === 'student') return Promise.resolve({ totalCreated: 2, avgProfileCompleteness: 50 });
        if (path.includes('to=2025-10-31') && service === 'company') return Promise.resolve({ totalCreated: 2, totalActive: 2 });
        if (path.includes('to=2025-10-31') && service === 'project') return Promise.resolve({ totalCreated: 2, byStatus: {}, activeCount: 1, avgTimeToFillDays: null });
        if (path.includes('to=2025-10-31') && service === 'application') return Promise.resolve({ total: 3, byStatus: {}, avgTimeToDecisionHours: null, acceptedCount: 1, rejectedCount: 1 });
        if (path.includes('to=2025-11-30') && service === 'student') return Promise.resolve({ totalCreated: 3, avgProfileCompleteness: 55 });
        if (path.includes('to=2025-11-30') && service === 'company') return Promise.resolve({ totalCreated: 2, totalActive: 2 });
        if (path.includes('to=2025-11-30') && service === 'project') return Promise.resolve({ totalCreated: 3, byStatus: {}, activeCount: 2, avgTimeToFillDays: null });
        if (path.includes('to=2025-11-30') && service === 'application') return Promise.resolve({ total: 7, byStatus: {}, avgTimeToDecisionHours: null, acceptedCount: 2, rejectedCount: 2 });
        return Promise.resolve(null);
      });
      platformMetricsRepo.findOne.mockResolvedValue(null);
      platformMetricsRepo.create.mockImplementation((v: any) => v);
      platformMetricsRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      const result = await service.runHistoricalAggregation(['2025-10-31', '2025-11-30']);

      expect(result.written).toBe(2);
      expect(platformMetricsRepo.save).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          totalStudents: 2,
          totalCompanies: 2,
          totalProjects: 2,
          totalApplications: 3,
          avgMatchScore: null,
          avgTimeToFillDays: null,
        }),
      );
      expect(platformMetricsRepo.save).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ totalStudents: 3, totalProjects: 3, totalApplications: 7 }),
      );
    });

    it('does not throw when every internal endpoint is unreachable for a historical date', async () => {
      mockHttpClient.get.mockResolvedValue(null);
      platformMetricsRepo.findOne.mockResolvedValue(null);
      platformMetricsRepo.create.mockImplementation((v: any) => v);
      platformMetricsRepo.save.mockImplementation((v: any) => Promise.resolve(v));

      await expect(service.runHistoricalAggregation(['2025-10-31'])).resolves.toEqual({ written: 1 });
    });
  });
});

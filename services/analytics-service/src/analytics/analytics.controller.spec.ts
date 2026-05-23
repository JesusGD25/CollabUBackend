import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard, RolesGuard, UserRole } from '@collab-u/shared';

import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

// ─── Mock ────────────────────────────────────────────────────────────────────

const mockAnalyticsService = {
  getDashboard: jest.fn(),
  getPlatformMetrics: jest.fn(),
  getProjectMetrics: jest.fn(),
  getProjectMetricsSummary: jest.fn(),
  getStudentMetrics: jest.fn(),
  getStudentMetricsSummary: jest.fn(),
  getCompanyMetrics: jest.fn(),
  getCompanyMetricsSummary: jest.fn(),
  getSkillTrends: jest.fn(),
  getTopDemandedSkills: jest.fn(),
  generateReport: jest.fn(),
  getReports: jest.fn(),
  getReport: jest.fn(),
};

const ADMIN_USER    = { id: 'admin-uuid-1', role: UserRole.ADMIN };
const STUDENT_USER  = { id: 'student-uuid-1', role: UserRole.STUDENT };
const COMPANY_USER  = { id: 'company-uuid-1', role: UserRole.COMPANY };

const projectId = '11111111-1111-1111-1111-111111111111';
const studentId = '22222222-2222-2222-2222-222222222222';
const companyId = '33333333-3333-3333-3333-333333333333';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: mockAnalyticsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    jest.clearAllMocks();
  });

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('should return dashboard data', async () => {
      const dashboard = { platformMetrics: { totalUsers: 100 }, topSkills: [], recentReports: [] };
      mockAnalyticsService.getDashboard.mockResolvedValue(dashboard);

      const result = await controller.getDashboard();

      expect(mockAnalyticsService.getDashboard).toHaveBeenCalled();
      expect(result).toEqual(dashboard);
    });
  });

  // ─── Platform Metrics ────────────────────────────────────────────────────────

  describe('getPlatformMetrics', () => {
    it('should delegate to service', async () => {
      const metrics = [{ totalUsers: 100 }];
      mockAnalyticsService.getPlatformMetrics.mockResolvedValue(metrics);

      const result = await controller.getPlatformMetrics({});

      expect(mockAnalyticsService.getPlatformMetrics).toHaveBeenCalledWith({});
      expect(result).toEqual(metrics);
    });
  });

  // ─── Project Metrics ─────────────────────────────────────────────────────────

  describe('getProjectMetrics', () => {
    it('should return metrics for a project', async () => {
      const metrics = [{ projectId, totalApplications: 15 }];
      mockAnalyticsService.getProjectMetrics.mockResolvedValue(metrics);

      const result = await controller.getProjectMetrics(projectId, {});

      expect(mockAnalyticsService.getProjectMetrics).toHaveBeenCalledWith(projectId, {});
      expect(result).toEqual(metrics);
    });
  });

  describe('getProjectMetricsSummary', () => {
    it('should return latest project snapshot', async () => {
      const summary = { projectId, totalApplications: 15 };
      mockAnalyticsService.getProjectMetricsSummary.mockResolvedValue(summary);

      const result = await controller.getProjectMetricsSummary(projectId);

      expect(mockAnalyticsService.getProjectMetricsSummary).toHaveBeenCalledWith(projectId);
      expect(result).toEqual(summary);
    });
  });

  // ─── Student Metrics ─────────────────────────────────────────────────────────

  describe('getStudentMetrics', () => {
    it('should use studentId from param for admin', async () => {
      mockAnalyticsService.getStudentMetrics.mockResolvedValue([]);

      await controller.getStudentMetrics(studentId, {}, ADMIN_USER);

      expect(mockAnalyticsService.getStudentMetrics).toHaveBeenCalledWith(studentId, {});
    });

    it('should use user.id from token for student role', async () => {
      mockAnalyticsService.getStudentMetrics.mockResolvedValue([]);

      await controller.getStudentMetrics(studentId, {}, STUDENT_USER);

      expect(mockAnalyticsService.getStudentMetrics).toHaveBeenCalledWith(STUDENT_USER.id, {});
    });
  });

  describe('getStudentMetricsSummary', () => {
    it('should use user.id for student role', async () => {
      mockAnalyticsService.getStudentMetricsSummary.mockResolvedValue({});

      await controller.getStudentMetricsSummary(studentId, STUDENT_USER);

      expect(mockAnalyticsService.getStudentMetricsSummary).toHaveBeenCalledWith(STUDENT_USER.id);
    });

    it('should use param id for admin', async () => {
      mockAnalyticsService.getStudentMetricsSummary.mockResolvedValue({});

      await controller.getStudentMetricsSummary(studentId, ADMIN_USER);

      expect(mockAnalyticsService.getStudentMetricsSummary).toHaveBeenCalledWith(studentId);
    });
  });

  // ─── Company Metrics ─────────────────────────────────────────────────────────

  describe('getCompanyMetrics', () => {
    it('should use user.id for company role', async () => {
      mockAnalyticsService.getCompanyMetrics.mockResolvedValue([]);

      await controller.getCompanyMetrics(companyId, {}, COMPANY_USER);

      expect(mockAnalyticsService.getCompanyMetrics).toHaveBeenCalledWith(COMPANY_USER.id, {});
    });

    it('should use param id for admin', async () => {
      mockAnalyticsService.getCompanyMetrics.mockResolvedValue([]);

      await controller.getCompanyMetrics(companyId, {}, ADMIN_USER);

      expect(mockAnalyticsService.getCompanyMetrics).toHaveBeenCalledWith(companyId, {});
    });
  });

  describe('getCompanyMetricsSummary', () => {
    it('should use company id from param for admin', async () => {
      mockAnalyticsService.getCompanyMetricsSummary.mockResolvedValue({});

      await controller.getCompanyMetricsSummary(companyId, ADMIN_USER);

      expect(mockAnalyticsService.getCompanyMetricsSummary).toHaveBeenCalledWith(companyId);
    });
  });

  // ─── Skill Trends ────────────────────────────────────────────────────────────

  describe('getSkillTrends', () => {
    it('should return skill trends', async () => {
      const trends = [{ skillName: 'TypeScript', demandCount: 40 }];
      mockAnalyticsService.getSkillTrends.mockResolvedValue(trends);

      const result = await controller.getSkillTrends({});

      expect(result).toEqual(trends);
    });
  });

  describe('getTopDemandedSkills', () => {
    it('should return top demanded skills', async () => {
      const skills = [{ skillName: 'TypeScript', demandCount: 40 }];
      mockAnalyticsService.getTopDemandedSkills.mockResolvedValue(skills);

      const result = await controller.getTopDemandedSkills();

      expect(mockAnalyticsService.getTopDemandedSkills).toHaveBeenCalledWith(10);
      expect(result).toEqual(skills);
    });
  });

  // ─── Reports ─────────────────────────────────────────────────────────────────

  describe('generateReport', () => {
    it('should call service with user id and dto', async () => {
      const report = { id: 'r-1', name: 'Resumen 2025-A' };
      mockAnalyticsService.generateReport.mockResolvedValue(report);

      const dto = { name: 'Resumen 2025-A', reportType: 'period_summary' };
      const result = await controller.generateReport(ADMIN_USER, dto as any);

      expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith(ADMIN_USER.id, dto);
      expect(result).toEqual(report);
    });
  });

  describe('getReports', () => {
    it('should return list of reports', async () => {
      const reports = [{ id: 'r-1', name: 'Test' }];
      mockAnalyticsService.getReports.mockResolvedValue(reports);

      const result = await controller.getReports({});

      expect(mockAnalyticsService.getReports).toHaveBeenCalledWith({});
      expect(result).toEqual(reports);
    });
  });

  describe('getReport', () => {
    it('should return a single report', async () => {
      const report = { id: 'r-1', name: 'Test' };
      mockAnalyticsService.getReport.mockResolvedValue(report);

      const result = await controller.getReport('r-1');

      expect(mockAnalyticsService.getReport).toHaveBeenCalledWith('r-1');
      expect(result).toEqual(report);
    });
  });
});

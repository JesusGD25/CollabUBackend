import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { EventPublisher } from '@collab-u/shared';

import { ProjectMetrics } from './entities/project-metrics.entity';
import { StudentMetrics } from './entities/student-metrics.entity';
import { CompanyMetrics } from './entities/company-metrics.entity';
import { PlatformMetrics } from './entities/platform-metrics.entity';
import { SkillTrend } from './entities/skill-trend.entity';
import { Report, ReportType } from './entities/report.entity';

import { MetricsQueryDto, GenerateReportDto } from './dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(ProjectMetrics)
    private readonly projectMetricsRepo: Repository<ProjectMetrics>,

    @InjectRepository(StudentMetrics)
    private readonly studentMetricsRepo: Repository<StudentMetrics>,

    @InjectRepository(CompanyMetrics)
    private readonly companyMetricsRepo: Repository<CompanyMetrics>,

    @InjectRepository(PlatformMetrics)
    private readonly platformMetricsRepo: Repository<PlatformMetrics>,

    @InjectRepository(SkillTrend)
    private readonly skillTrendRepo: Repository<SkillTrend>,

    @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,

    private readonly eventPublisher: EventPublisher,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [latestPlatformArr, topSkills, recentReports] = await Promise.all([
      this.platformMetricsRepo.find({
        order: { snapshotDate: 'DESC' },
        take: 1,
      }),
      this.skillTrendRepo.find({
        order: { demandCount: 'DESC' },
        take: 10,
      }),
      this.reportRepo.find({
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [platformThisMonthArr] = await Promise.all([
      this.platformMetricsRepo.find({
        where: { snapshotDate: MoreThanOrEqual(thirtyDaysAgo) as any },
        order: { snapshotDate: 'ASC' },
        take: 1,
      }),
    ]);

    const latestPlatform = latestPlatformArr[0] ?? null;
    const platformThisMonth = platformThisMonthArr[0] ?? null;

    const newUsersThisMonth =
      latestPlatform && platformThisMonth
        ? latestPlatform.totalUsers - platformThisMonth.totalUsers
        : latestPlatform?.newUsersPeriod ?? 0;

    const newProjectsThisMonth =
      latestPlatform && platformThisMonth
        ? latestPlatform.totalProjects - platformThisMonth.totalProjects
        : latestPlatform?.newProjectsPeriod ?? 0;

    return {
      platformMetrics: {
        totalUsers: latestPlatform?.totalUsers ?? 0,
        totalStudents: latestPlatform?.totalStudents ?? 0,
        totalCompanies: latestPlatform?.totalCompanies ?? 0,
        totalProjects: latestPlatform?.totalProjects ?? 0,
        activeProjects: latestPlatform?.activeProjects ?? 0,
        totalApplications: latestPlatform?.totalApplications ?? 0,
        avgMatchScore: latestPlatform?.avgMatchScore ?? null,
      },
      trends: {
        newUsersThisMonth,
        newProjectsThisMonth,
        applicationsThisMonth: latestPlatform?.newUsersPeriod ?? 0,
        lastSnapshotDate: latestPlatform?.snapshotDate ?? null,
      },
      topSkills: topSkills.map((s) => ({
        name: s.skillName,
        demand: s.demandCount,
        supply: s.supplyCount,
        gap: s.gapIndex,
        trend: s.trendDirection,
      })),
      recentReports: recentReports.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.reportType,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  // ─── Platform Metrics ────────────────────────────────────────────────────────

  async getPlatformMetrics(query: MetricsQueryDto): Promise<PlatformMetrics[]> {
    const where = this.buildDateRange(query);
    return this.platformMetricsRepo.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: 90,
    });
  }

  async recordPlatformSnapshot(data: Partial<PlatformMetrics>): Promise<PlatformMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.platformMetricsRepo.findOne({
      where: { snapshotDate: today as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.platformMetricsRepo.save(existing);
    }

    const snapshot = this.platformMetricsRepo.create({
      ...data,
      snapshotDate: today,
    });
    return this.platformMetricsRepo.save(snapshot);
  }

  // ─── Project Metrics ─────────────────────────────────────────────────────────

  async getProjectMetrics(projectId: string, query: MetricsQueryDto): Promise<ProjectMetrics[]> {
    const where: any = { projectId, ...this.buildDateRange(query) };
    return this.projectMetricsRepo.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: 90,
    });
  }

  async getProjectMetricsSummary(projectId: string): Promise<ProjectMetrics> {
    const metrics = await this.projectMetricsRepo.findOne({
      where: { projectId },
      order: { snapshotDate: 'DESC' },
    });

    if (!metrics) {
      throw new NotFoundException(`No hay métricas para el proyecto ${projectId}`);
    }

    return metrics;
  }

  async upsertProjectMetrics(
    projectId: string,
    data: Partial<ProjectMetrics>,
  ): Promise<ProjectMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.projectMetricsRepo.findOne({
      where: { projectId, snapshotDate: today as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.projectMetricsRepo.save(existing);
    }

    const snapshot = this.projectMetricsRepo.create({
      projectId,
      ...data,
      snapshotDate: today,
    });
    return this.projectMetricsRepo.save(snapshot);
  }

  // ─── Student Metrics ─────────────────────────────────────────────────────────

  async getStudentMetrics(studentId: string, query: MetricsQueryDto): Promise<StudentMetrics[]> {
    const where: any = { studentId, ...this.buildDateRange(query) };
    return this.studentMetricsRepo.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: 90,
    });
  }

  async getStudentMetricsSummary(studentId: string): Promise<StudentMetrics> {
    const metrics = await this.studentMetricsRepo.findOne({
      where: { studentId },
      order: { snapshotDate: 'DESC' },
    });

    if (!metrics) {
      throw new NotFoundException(`No hay métricas para el estudiante ${studentId}`);
    }

    return metrics;
  }

  async upsertStudentMetrics(
    studentId: string,
    data: Partial<StudentMetrics>,
  ): Promise<StudentMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.studentMetricsRepo.findOne({
      where: { studentId, snapshotDate: today as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.studentMetricsRepo.save(existing);
    }

    const snapshot = this.studentMetricsRepo.create({
      studentId,
      ...data,
      snapshotDate: today,
    });
    return this.studentMetricsRepo.save(snapshot);
  }

  // ─── Company Metrics ─────────────────────────────────────────────────────────

  async getCompanyMetrics(companyId: string, query: MetricsQueryDto): Promise<CompanyMetrics[]> {
    const where: any = { companyId, ...this.buildDateRange(query) };
    return this.companyMetricsRepo.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: 90,
    });
  }

  async getCompanyMetricsSummary(companyId: string): Promise<CompanyMetrics> {
    const metrics = await this.companyMetricsRepo.findOne({
      where: { companyId },
      order: { snapshotDate: 'DESC' },
    });

    if (!metrics) {
      throw new NotFoundException(`No hay métricas para la empresa ${companyId}`);
    }

    return metrics;
  }

  async upsertCompanyMetrics(
    companyId: string,
    data: Partial<CompanyMetrics>,
  ): Promise<CompanyMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.companyMetricsRepo.findOne({
      where: { companyId, snapshotDate: today as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.companyMetricsRepo.save(existing);
    }

    const snapshot = this.companyMetricsRepo.create({
      companyId,
      ...data,
      snapshotDate: today,
    });
    return this.companyMetricsRepo.save(snapshot);
  }

  // ─── Skill Trends ────────────────────────────────────────────────────────────

  async getSkillTrends(query: MetricsQueryDto): Promise<SkillTrend[]> {
    const where = this.buildDateRange(query);
    return this.skillTrendRepo.find({
      where,
      order: { gapIndex: 'DESC' },
      take: 50,
    });
  }

  async getTopDemandedSkills(limit = 10): Promise<SkillTrend[]> {
    return this.skillTrendRepo.find({
      order: { demandCount: 'DESC' },
      take: limit,
    });
  }

  async upsertSkillTrend(
    skillName: string,
    data: Partial<SkillTrend>,
  ): Promise<SkillTrend> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.skillTrendRepo.findOne({
      where: { skillName, snapshotDate: today as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.skillTrendRepo.save(existing);
    }

    const trend = this.skillTrendRepo.create({
      skillName,
      ...data,
      snapshotDate: today,
    });
    return this.skillTrendRepo.save(trend);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async generateReport(generatedBy: string, dto: GenerateReportDto): Promise<Report> {
    const reportData = await this.buildReportData(dto);

    const report = this.reportRepo.create({
      name: dto.name,
      reportType: dto.reportType as ReportType,
      generatedBy,
      periodId: dto.periodId ?? null,
      parameters: dto.parameters ?? null,
      data: reportData,
      status: 'completed',
    });

    const saved = await this.reportRepo.save(report);
    this.logger.log(`Reporte generado: ${saved.id} (${saved.reportType})`);

    await this.eventPublisher.publish(
      'analytics.report.generated',
      {
        reportId: saved.id,
        reportType: saved.reportType,
        generatedBy,
        name: saved.name,
      },
      'analytics-service',
    );

    return saved;
  }

  async getReports(query: MetricsQueryDto): Promise<Report[]> {
    const where = this.buildDateRange(query);
    return this.reportRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getReport(id: string): Promise<Report> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Reporte ${id} no encontrado`);
    }
    return report;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildDateRange(query: MetricsQueryDto): Record<string, any> {
    const where: Record<string, any> = {};
    if (query.from && query.to) {
      where.snapshotDate = Between(new Date(query.from), new Date(query.to));
    } else if (query.from) {
      where.snapshotDate = MoreThanOrEqual(new Date(query.from));
    } else if (query.to) {
      where.snapshotDate = LessThanOrEqual(new Date(query.to));
    }
    return where;
  }

  private async buildReportData(dto: GenerateReportDto): Promise<Record<string, any>> {
    const query: MetricsQueryDto = {
      periodId: dto.periodId,
      ...(dto.parameters?.from ? { from: dto.parameters.from } : {}),
      ...(dto.parameters?.to ? { to: dto.parameters.to } : {}),
    };

    switch (dto.reportType) {
      case 'period_summary': {
        const [platform, topSkills] = await Promise.all([
          this.getPlatformMetrics(query),
          this.getTopDemandedSkills(10),
        ]);
        return { platformMetrics: platform, topSkills, generatedAt: new Date() };
      }

      case 'skill_gap_analysis': {
        const skills = await this.getSkillTrends(query);
        return {
          skills: skills.map((s) => ({
            name: s.skillName,
            demand: s.demandCount,
            supply: s.supplyCount,
            gap: s.gapIndex,
            trend: s.trendDirection,
          })),
          generatedAt: new Date(),
        };
      }

      case 'matching_effectiveness': {
        const platform = await this.getPlatformMetrics(query);
        return {
          avgMatchScore: platform[0]?.avgMatchScore ?? null,
          avgTimeToFillDays: platform[0]?.avgTimeToFillDays ?? null,
          platformMetrics: platform,
          generatedAt: new Date(),
        };
      }

      default:
        return {
          type: dto.reportType,
          parameters: dto.parameters ?? {},
          generatedAt: new Date(),
        };
    }
  }
}

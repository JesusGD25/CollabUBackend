import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient, DepartmentScope } from '@collab-u/shared';

import { ProjectMetrics } from './entities/project-metrics.entity';
import { StudentMetrics } from './entities/student-metrics.entity';
import { CompanyMetrics } from './entities/company-metrics.entity';
import { PlatformMetrics } from './entities/platform-metrics.entity';
import { SkillTrend } from './entities/skill-trend.entity';
import { Report, ReportType } from './entities/report.entity';

import { MetricsQueryDto, GenerateReportDto, SkillTrendsQueryDto } from './dto';

// ─── Formas de respuesta de los endpoints internos agregados (contrato congelado en §1.5 del planning) ──

interface ApplicationStats {
  total: number;
  byStatus: Record<string, number>;
  avgTimeToDecisionHours: number | null;
  acceptedCount: number;
  rejectedCount: number;
}

interface ProjectStats {
  totalCreated: number;
  byStatus: Record<string, number>;
  activeCount: number;
  avgTimeToFillDays: number | null;
}

interface StudentStats {
  totalCreated: number;
  avgProfileCompleteness: number | null;
}

interface CompanyStats {
  totalCreated: number;
  totalActive: number;
}

interface MatchingStats {
  avgOverallScore: number | null;
  count: number;
}

interface EvaluationStats {
  avgOverallScore: number | null;
  count: number;
  byEvaluationType: Record<string, { avg: number | null; count: number }>;
}

interface SkillAggregateEntry {
  demandCount?: number;
  supplyCount?: number;
  avgProficiencyLevel?: number;
  category: string;
  name: string;
}

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
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  /**
   * Departamento efectivo de una consulta: el admin de departamento SIEMPRE queda en el suyo (ignora lo que
   * pida); el superadmin y los demás roles usan el `programId` solicitado, o null = toda la Facultad.
   */
  private effectiveProgram(scope: DepartmentScope | null | undefined, requested?: string | null): string | null {
    if (scope && !scope.all) return scope.departmentId;
    return requested || null;
  }

  private programWhere(programId: string | null) {
    return programId ? programId : IsNull();
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboard(scope: DepartmentScope | null = null, requestedProgramId?: string) {
    const programId = this.effectiveProgram(scope, requestedProgramId);
    const programFilter = this.programWhere(programId);
    const latestSkillDate = await this.latestSkillSnapshotDate(programId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [latestPlatformArr, topSkills, recentReports] = await Promise.all([
      this.platformMetricsRepo.find({
        where: { programId: programFilter as any },
        order: { snapshotDate: 'DESC' },
        take: 1,
      }),
      this.skillTrendRepo.find({
        where: { programId: programFilter as any, ...(latestSkillDate ? { snapshotDate: latestSkillDate as any } : {}) },
        order: { demandCount: 'DESC' },
        take: 10,
      }),
      this.reportRepo.find({
        where: scope && !scope.all ? { programId: scope.departmentId } : {},
        order: { createdAt: 'DESC' },
        take: 5,
      }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [platformThisMonthArr] = await Promise.all([
      this.platformMetricsRepo.find({
        where: { snapshotDate: MoreThanOrEqual(thirtyDaysAgo) as any, programId: programFilter as any },
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

    const newApplicationsThisMonth =
      latestPlatform && platformThisMonth
        ? latestPlatform.totalApplications - platformThisMonth.totalApplications
        : latestPlatform?.totalApplications ?? 0;

    return {
      scope: { programId },
      platformMetrics: {
        totalUsers: latestPlatform?.totalUsers ?? 0,
        totalStudents: latestPlatform?.totalStudents ?? 0,
        totalCompanies: latestPlatform?.totalCompanies ?? 0,
        totalProjects: latestPlatform?.totalProjects ?? 0,
        activeProjects: latestPlatform?.activeProjects ?? 0,
        totalApplications: latestPlatform?.totalApplications ?? 0,
        avgMatchScore: latestPlatform?.avgMatchScore != null ? Number(latestPlatform.avgMatchScore) : null,
      },
      trends: {
        newUsersThisMonth,
        newProjectsThisMonth,
        applicationsThisMonth: newApplicationsThisMonth,
        lastSnapshotDate: latestPlatform?.snapshotDate ?? null,
      },
      topSkills: topSkills.map((s) => ({
        name: s.skillName,
        demand: s.demandCount,
        supply: s.supplyCount,
        gap: s.gapIndex != null ? Number(s.gapIndex) : null,
        trend: s.trendDirection,
        category: s.category,
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

  // ─── Platform Metrics (serie histórica — depende de las filas escritas por el cron, ver AnalyticsCronService) ──

  async getPlatformMetrics(query: MetricsQueryDto, scope: DepartmentScope | null = null): Promise<PlatformMetrics[]> {
    const where = this.buildDateRange(query);
    where.programId = this.programWhere(this.effectiveProgram(scope, query.programId));
    return this.platformMetricsRepo.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: 90,
    });
  }

  async recordPlatformSnapshot(
    data: Partial<PlatformMetrics>,
    snapshotDate?: Date,
    programId: string | null = null,
  ): Promise<PlatformMetrics> {
    const today = snapshotDate ?? new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.platformMetricsRepo.findOne({
      where: { snapshotDate: today as any, programId: this.programWhere(programId) as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.platformMetricsRepo.save(existing);
    }

    const snapshot = this.platformMetricsRepo.create({
      ...data,
      programId,
      snapshotDate: today,
    });
    return this.platformMetricsRepo.save(snapshot);
  }

  // ─── Project Metrics ─────────────────────────────────────────────────────────

  /** Serie histórica — depende de las filas escritas por el cron (campos puntuales, ver §1.3/§1.4 del planning). */
  async getProjectMetrics(projectId: string, query: MetricsQueryDto): Promise<ProjectMetrics[]> {
    const where: any = { projectId, ...this.buildDateRange(query) };
    return this.projectMetricsRepo.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: 90,
    });
  }

  /**
   * Resumen "ahora mismo" de un proyecto — calculado bajo demanda (§1.4/§1.6 del planning), no depende
   * de que el cron ya haya corrido hoy. Los campos que ningún endpoint interno actual puede resolver por
   * proyecto (avgMatchScore, avgTimeToFillDays, totalViews) se dejan en su último valor snapshot si existe,
   * o null/0 explícito — nunca se fabrican.
   */
  async getProjectMetricsSummary(projectId: string): Promise<Partial<ProjectMetrics> & { projectId: string }> {
    const [appStats, evalStats, storedArr] = await Promise.all([
      this.fetchApplicationStats({ projectId }),
      this.fetchEvaluationStats({ projectId }),
      this.projectMetricsRepo.find({ where: { projectId }, order: { snapshotDate: 'DESC' }, take: 1 }),
    ]);
    const stored = storedArr[0] ?? null;

    if (!appStats && !stored) {
      throw new NotFoundException(`No hay métricas para el proyecto ${projectId}`);
    }

    const totalApplications = appStats?.total ?? stored?.totalApplications ?? 0;
    const acceptedApplications = appStats?.acceptedCount ?? stored?.acceptedApplications ?? 0;
    const rejectedApplications = appStats?.rejectedCount ?? stored?.rejectedApplications ?? 0;
    const completedCount = appStats?.byStatus?.['completed'] ?? 0;
    const completionRate =
      totalApplications > 0
        ? Math.round((completedCount / totalApplications) * 10000) / 100
        : stored?.completionRate ?? null;
    const conversionRate =
      totalApplications > 0
        ? Math.round((acceptedApplications / totalApplications) * 10000) / 100
        : stored?.conversionRate ?? null;

    return {
      id: stored?.id,
      projectId,
      periodId: stored?.periodId ?? null,
      totalApplications,
      acceptedApplications,
      rejectedApplications,
      // matching-service hoy no soporta filtro por proyecto (contrato §1.5 solo admite from/to) — se usa el
      // último valor snapshot como aproximación hasta extender ese endpoint.
      avgMatchScore: stored?.avgMatchScore ?? null,
      // project-service documenta explícitamente que no tiene un timestamp de "publicado" utilizable —
      // ver comentario en project.service.ts getInternalAnalyticsStats(). No se fabrica este valor.
      avgTimeToFillDays: stored?.avgTimeToFillDays ?? null,
      completionRate,
      avgEvaluationScore: evalStats?.avgOverallScore ?? stored?.avgEvaluationScore ?? null,
      // ningún servicio auditado registra "vistas" de un proyecto — se mantiene en 0 hasta que exista esa fuente.
      totalViews: stored?.totalViews ?? 0,
      conversionRate,
      snapshotDate: stored?.snapshotDate ?? new Date(),
      createdAt: stored?.createdAt ?? new Date(),
    };
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

  /**
   * Resumen "ahora mismo" de un estudiante — calculado bajo demanda. `profileCompleteness` viene en vivo
   * de student-service (columna real `student_profiles.profile_completeness`, expuesta en matching-data).
   * `responseRate` se calcula en vivo desde appStats (% de aplicaciones ya decididas, no pending).
   * `avgMatchScore` sigue sin fuente por-estudiante: matching-service hoy solo admite filtro from/to
   * (contrato §1.5), no studentId — limitación real documentada, no fabricada.
   */
  async getStudentMetricsSummary(studentId: string): Promise<Partial<StudentMetrics> & { studentId: string }> {
    const [appStats, evalStats, matchingData, storedArr] = await Promise.all([
      this.fetchApplicationStats({ studentId }),
      this.fetchEvaluationStats({ studentId }),
      this.httpClient
        .get<{ skills: unknown[]; profileCompleteness?: number }>('student', `/internal/students/${studentId}/matching-data`)
        .catch(() => null),
      this.studentMetricsRepo.find({ where: { studentId }, order: { snapshotDate: 'DESC' }, take: 1 }),
    ]);
    const stored = storedArr[0] ?? null;

    if (!appStats && !stored) {
      throw new NotFoundException(`No hay métricas para el estudiante ${studentId}`);
    }

    // avgEvaluationScore = solo evaluaciones RECIBIDAS por el estudiante (empresa/asesor evaluando al
    // estudiante), no las que el estudiante dio — se filtran los dos tipos relevantes de byEvaluationType.
    const receivedTypes = ['company_evaluates_student', 'supervisor_evaluates_student'];
    const avgEvaluationReceived = this.weightedAverage(
      receivedTypes.map((t) => evalStats?.byEvaluationType?.[t]).filter(Boolean) as { avg: number | null; count: number }[],
    );
    const responseRate =
      appStats && appStats.total > 0
        ? Math.round(((appStats.acceptedCount + appStats.rejectedCount) / appStats.total) * 10000) / 100
        : null;

    return {
      id: stored?.id,
      studentId,
      totalApplications: appStats?.total ?? stored?.totalApplications ?? 0,
      acceptedCount: appStats?.acceptedCount ?? stored?.acceptedCount ?? 0,
      rejectedCount: appStats?.rejectedCount ?? stored?.rejectedCount ?? 0,
      // matching-service hoy no soporta filtro por estudiante (contrato §1.5 solo admite from/to).
      avgMatchScore: stored?.avgMatchScore ?? null,
      profileCompleteness: matchingData?.profileCompleteness ?? stored?.profileCompleteness ?? 0,
      avgEvaluationScore: avgEvaluationReceived ?? stored?.avgEvaluationScore ?? null,
      totalProjectsCompleted: appStats?.byStatus?.['completed'] ?? stored?.totalProjectsCompleted ?? 0,
      skillsCount: matchingData?.skills?.length ?? stored?.skillsCount ?? 0,
      responseRate: responseRate ?? stored?.responseRate ?? null,
      snapshotDate: stored?.snapshotDate ?? new Date(),
      createdAt: stored?.createdAt ?? new Date(),
    };
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

  /**
   * Resumen "ahora mismo" de una empresa. totalProjects/activeProjects se calculan en vivo (project-service
   * SÍ soporta filtro por companyId). totalApplicationsReceived/avgTimeToRespondHours/avgEvaluationGiven/
   * Received/totalStudentsHired requieren un join de dos saltos (companyId → sus projectIds → aplicaciones/
   * evaluaciones de esos proyectos) — mismo patrón two-hop ya usado en el reporte 'company_performance'
   * (ver buildReportData), replicado aquí en vivo en vez de depender del snapshot nunca poblado.
   */
  async getCompanyMetricsSummary(
    companyId: string,
  ): Promise<Partial<CompanyMetrics> & { companyId: string; completedProjects: number }> {
    const [projectStats, projectIds, storedArr] = await Promise.all([
      this.fetchProjectStats({ companyId }),
      this.fetchCompanyProjectIds(companyId),
      this.companyMetricsRepo.find({ where: { companyId }, order: { snapshotDate: 'DESC' }, take: 1 }),
    ]);
    const stored = storedArr[0] ?? null;

    if (!projectStats && !stored) {
      throw new NotFoundException(`No hay métricas para la empresa ${companyId}`);
    }

    const ids = projectIds ?? [];
    const [appStatsPerProject, evalStatsPerProject] = await Promise.all([
      Promise.all(ids.map((projectId) => this.fetchApplicationStats({ projectId }))),
      Promise.all(ids.map((projectId) => this.fetchEvaluationStats({ projectId }))),
    ]);

    const totalApplicationsReceived = appStatsPerProject.reduce((sum, s) => sum + (s?.total ?? 0), 0);
    const totalStudentsHired = appStatsPerProject.reduce((sum, s) => sum + (s?.acceptedCount ?? 0), 0);
    const avgTimeToRespondHours = this.weightedAverage(
      appStatsPerProject
        .filter((s): s is ApplicationStats => !!s && s.total > 0)
        .map((s) => ({ avg: s.avgTimeToDecisionHours, count: s.total })),
    );
    const givenEntries = evalStatsPerProject
      .filter((s): s is EvaluationStats => !!s)
      .map((s) => s.byEvaluationType?.['company_evaluates_student'])
      .filter(Boolean) as { avg: number | null; count: number }[];
    const receivedEntries = evalStatsPerProject
      .filter((s): s is EvaluationStats => !!s)
      .map((s) => s.byEvaluationType?.['student_evaluates_company'])
      .filter(Boolean) as { avg: number | null; count: number }[];
    const avgEvaluationGiven = this.weightedAverage(givenEntries);
    const avgEvaluationReceived = this.weightedAverage(receivedEntries);

    const totalProjects = projectStats?.totalCreated ?? stored?.totalProjects ?? 0;
    const activeProjects = projectStats?.activeCount ?? stored?.activeProjects ?? 0;
    const completedProjects = projectStats?.byStatus?.['completed'] ?? 0;
    const completionRate =
      totalProjects > 0
        ? Math.round((completedProjects / totalProjects) * 10000) / 100
        : stored?.completionRate ?? null;

    return {
      id: stored?.id,
      companyId,
      totalProjects,
      activeProjects,
      // expuesto explícitamente en vez de dejar que el frontend infiera "finalizados" restando
      // totalProjects-activeProjects (eso incluiría draft/cancelled/needs_changes, no solo completed).
      completedProjects,
      totalApplicationsReceived: projectIds ? totalApplicationsReceived : stored?.totalApplicationsReceived ?? 0,
      avgTimeToRespondHours: projectIds ? avgTimeToRespondHours : stored?.avgTimeToRespondHours ?? null,
      avgEvaluationGiven: projectIds ? avgEvaluationGiven : stored?.avgEvaluationGiven ?? null,
      avgEvaluationReceived: projectIds ? avgEvaluationReceived : stored?.avgEvaluationReceived ?? null,
      totalStudentsHired: projectIds ? totalStudentsHired : stored?.totalStudentsHired ?? 0,
      completionRate,
      snapshotDate: stored?.snapshotDate ?? new Date(),
      createdAt: stored?.createdAt ?? new Date(),
    };
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

  // ─── Skill Trends (serie histórica — depende del cron) ────────────────────────

  /**
   * Fecha del snapshot de skills más reciente. skill_trends guarda una fila por skill y por día;
   * sin filtrar por fecha, "top skills" y "tendencias" mezclarían todos los días y repetirían
   * cada habilidad tantas veces como snapshots existan.
   */
  private async latestSkillSnapshotDate(programId: string | null = null): Promise<SkillTrend['snapshotDate'] | null> {
    const latest = await this.skillTrendRepo.findOne({
      where: { programId: this.programWhere(programId) as any },
      order: { snapshotDate: 'DESC' },
    });
    return latest?.snapshotDate ?? null;
  }

  /**
   * Oferta vs demanda de habilidades con filtros: departamento, categoría, texto, orden y tope.
   * Admin de departamento → siempre su departamento. Sin rango de fechas devuelve el último snapshot.
   */
  async getSkillTrends(query: SkillTrendsQueryDto, scope: DepartmentScope | null = null): Promise<SkillTrend[]> {
    const programId = this.effectiveProgram(scope, query.programId);
    const qb = this.skillTrendRepo.createQueryBuilder('t');
    qb.where(programId ? 't.program_id = :programId' : 't.program_id IS NULL', { programId });

    if (query.from && query.to) {
      qb.andWhere('t.snapshot_date BETWEEN :from AND :to', { from: query.from, to: query.to });
    } else if (query.from) {
      qb.andWhere('t.snapshot_date >= :from', { from: query.from });
    } else if (query.to) {
      qb.andWhere('t.snapshot_date <= :to', { to: query.to });
    } else {
      // Sin rango explícito se devuelve el estado actual (último snapshot), no el histórico mezclado.
      const latest = await this.latestSkillSnapshotDate(programId);
      if (latest) qb.andWhere('t.snapshot_date = :latest', { latest });
    }
    if (query.category) qb.andWhere('t.category = :category', { category: query.category });
    if (query.search) qb.andWhere('t.skill_name ILIKE :search', { search: `%${query.search}%` });

    const sortColumn = { gap: 't.gap_index', demand: 't.demand_count', supply: 't.supply_count', name: 't.skill_name' }[
      query.sort ?? 'gap'
    ];
    qb.orderBy(sortColumn, (query.order ?? (query.sort === 'name' ? 'asc' : 'desc')).toUpperCase() as 'ASC' | 'DESC');
    qb.addOrderBy('t.skill_name', 'ASC');
    qb.take(Math.min(200, Math.max(1, query.limit ?? 50)));
    return qb.getMany();
  }

  async getTopDemandedSkills(limit = 10, scope: DepartmentScope | null = null, requestedProgramId?: string): Promise<SkillTrend[]> {
    const programId = this.effectiveProgram(scope, requestedProgramId);
    const latest = await this.latestSkillSnapshotDate(programId);
    return this.skillTrendRepo.find({
      where: { programId: this.programWhere(programId) as any, ...(latest ? { snapshotDate: latest as any } : {}) },
      order: { demandCount: 'DESC' },
      take: limit,
    });
  }

  async upsertSkillTrend(
    skillName: string,
    data: Partial<SkillTrend>,
    programId: string | null = null,
  ): Promise<SkillTrend> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await this.skillTrendRepo.findOne({
      where: { skillName, snapshotDate: today as any, programId: this.programWhere(programId) as any },
    });

    if (existing) {
      Object.assign(existing, data);
      return this.skillTrendRepo.save(existing);
    }

    const trend = this.skillTrendRepo.create({
      skillName,
      ...data,
      programId,
      snapshotDate: today,
    });
    return this.skillTrendRepo.save(trend);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async generateReport(generatedBy: string, dto: GenerateReportDto, scope: DepartmentScope | null = null): Promise<Report> {
    // El reporte hereda el departamento: admin de departamento → el suyo; superadmin → el elegido o la Facultad.
    const programId = this.effectiveProgram(scope, dto.programId);
    dto = { ...dto, programId: programId ?? undefined };
    if (scope && !scope.all) await this.assertEntityInDepartment(dto, scope.departmentId);
    let reportData: Record<string, any>;
    let status: 'completed' | 'failed' = 'completed';

    try {
      reportData = await this.buildReportData(dto);
    } catch (err) {
      this.logger.error(`Fallo al generar reporte "${dto.name}" (${dto.reportType}): ${(err as Error).message}`);
      status = 'failed';
      reportData = { error: (err as Error).message };
    }

    const report = this.reportRepo.create({
      name: dto.name,
      reportType: dto.reportType as ReportType,
      generatedBy,
      periodId: dto.periodId ?? null,
      programId,
      entityId: dto.entityId ?? null,
      parameters: dto.parameters ?? null,
      data: reportData,
      status,
    });

    const saved = await this.reportRepo.save(report);
    this.logger.log(`Reporte generado: ${saved.id} (${saved.reportType}, status=${saved.status})`);

    if (status === 'completed') {
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
    }

    return saved;
  }

  /**
   * Un reporte de UNA entidad (empresa, estudiante o docente) solo puede pedirlo un admin de departamento
   * si esa entidad pertenece a su departamento. Fuera de alcance → 404, igual que en el resto de servicios.
   */
  private async assertEntityInDepartment(dto: GenerateReportDto, departmentId: string): Promise<void> {
    const id = dto.entityId;
    if (!id) return;
    let programIds: string[] | null = null;
    switch (dto.reportType) {
      case 'company_performance': {
        const info = await this.httpClient
          .get<{ programIds?: string[] }>('company', `/internal/companies/${id}/basic-info`)
          .catch(() => null);
        programIds = info ? (info.programIds ?? []) : null;
        break;
      }
      case 'student_outcomes': {
        const data = await this.httpClient
          .get<{ programId?: string | null }>('student', `/internal/students/${id}/matching-data`)
          .catch(() => null);
        programIds = data ? (data.programId ? [data.programId] : []) : null;
        break;
      }
      case 'supervisor_report': {
        const sup = await this.httpClient
          .get<{ programId?: string | null }>('admin', `/internal/admin/supervisors/${id}`)
          .catch(() => null);
        programIds = sup ? (sup.programId ? [sup.programId] : []) : null;
        break;
      }
      default:
        return;
    }
    if (!programIds || !programIds.includes(departmentId)) {
      throw new NotFoundException('La entidad solicitada no existe en tu departamento.');
    }
  }

  async getReports(query: MetricsQueryDto, scope: DepartmentScope | null = null): Promise<Report[]> {
    const where = this.buildDateRange(query);
    // Admin de departamento: solo los reportes de su departamento.
    if (scope && !scope.all) where.programId = scope.departmentId;
    return this.reportRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getReport(id: string, scope: DepartmentScope | null = null): Promise<Report> {
    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report || (scope && !scope.all && report.programId !== scope.departmentId)) {
      throw new NotFoundException(`Reporte ${id} no encontrado`);
    }
    return report;
  }

  // ─── Agregación diaria (mecanismo puntual, ver §1.4 del planning) ──────────────

  /**
   * Invocada por AnalyticsCronService una vez al día. Calcula y persiste las métricas puntuales sobre
   * estado no historizado (§1.3/§1.4): platform_metrics y skill_trends. Los snapshots por-entidad
   * (project_metrics/student_metrics/company_metrics históricos) quedan fuera de este primer corte —
   * requieren un endpoint de "listar IDs activos" que ningún servicio fuente expone todavía (documentado
   * como pendiente en el planning); los endpoints /summary ya funcionan sin depender de esas filas porque
   * se calculan bajo demanda (ver arriba).
   */
  async runDailyAggregation(): Promise<void> {
    // Total de la Facultad + una pasada por cada departamento activo (mismos fetchers, filtrados por programId).
    await this.aggregateScope(null);
    const programs = await this.httpClient
      .get<{ id: string; isActive?: boolean }[]>('admin', '/internal/admin/programs')
      .catch((err) => {
        this.logger.warn(`No se pudo obtener el catálogo de departamentos: ${err.message}`);
        return [] as { id: string; isActive?: boolean }[];
      });
    for (const program of (Array.isArray(programs) ? programs : []).filter((p) => p.isActive !== false)) {
      try {
        await this.aggregateScope(program.id);
      } catch (err) {
        this.logger.error(`Agregación del departamento ${program.id} falló: ${(err as Error).message}`);
      }
    }
  }

  private async aggregateScope(programId: string | null): Promise<void> {
    const pid = programId ?? undefined;
    const [projectStats, appStats, studentStats, companyStats, matchingStats, demand, supply] =
      await Promise.all([
        this.fetchProjectStats({ programId: pid }),
        this.fetchApplicationStats({ programId: pid }),
        this.fetchStudentStats(undefined, undefined, pid),
        this.fetchCompanyStats(undefined, undefined, pid),
        // El score de matching no se calcula por departamento: solo el total de la Facultad lo lleva.
        programId ? Promise.resolve(null) : this.fetchMatchingStats(),
        this.fetchSkillDemand(pid),
        this.fetchSkillSupply(pid),
      ]);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const [projectStats24h, studentStats24h, companyStats24h] = await Promise.all([
      this.fetchProjectStats({ from: yesterday.toISOString(), programId: pid }),
      this.fetchStudentStats(yesterday.toISOString(), undefined, pid),
      this.fetchCompanyStats(yesterday.toISOString(), undefined, pid),
    ]);

    // totalUsers no tiene endpoint propio (user-service no está en el contrato §1.5) — se aproxima con
    // estudiantes + empresas, documentado como subconteo conocido (excluye cuentas admin/faculty).
    const totalUsers = (studentStats?.totalCreated ?? 0) + (companyStats?.totalCreated ?? 0);
    const newUsersPeriod = (studentStats24h?.totalCreated ?? 0) + (companyStats24h?.totalCreated ?? 0);

    await this.recordPlatformSnapshot(
      {
        totalUsers,
        totalStudents: studentStats?.totalCreated ?? 0,
        totalCompanies: companyStats?.totalCreated ?? 0,
        totalProjects: projectStats?.totalCreated ?? 0,
        totalApplications: appStats?.total ?? 0,
        activeProjects: projectStats?.activeCount ?? 0,
        avgMatchScore: matchingStats?.avgOverallScore ?? null,
        avgTimeToFillDays: projectStats?.avgTimeToFillDays ?? null,
        newUsersPeriod,
        newProjectsPeriod: projectStats24h?.totalCreated ?? 0,
      },
      undefined,
      programId,
    );

    await this.upsertSkillTrends(demand, supply, programId);

    this.logger.log(
      `Snapshot diario (${programId ?? 'Facultad'}): ${projectStats?.totalCreated ?? 0} proyectos, ${studentStats?.totalCreated ?? 0} estudiantes, ${companyStats?.totalCreated ?? 0} empresas, ${appStats?.total ?? 0} aplicaciones, ${Object.keys(demand ?? {}).length + Object.keys(supply ?? {}).length > 0 ? 'skills OK' : 'sin datos de skills'}.`,
    );
  }

  /**
   * Backfill histórico (FASE 5 del planning, §9) — genera un punto de `platform_metrics` por cada
   * fecha de corte recibida, usando los mismos endpoints internos que `runDailyAggregation` pero con
   * `to: fecha` (soportado desde FASE2 por los 4 endpoints de acumulativos). Reconstruye una serie
   * temporal REAL de campos acumulativos (totales a esa fecha, `COUNT(*) WHERE created_at <= fecha`
   * — correcto para cualquier fecha pasada, ver §1.3 del planning).
   *
   * Los campos puntuales (avgMatchScore, activeProjects, avgTimeToFillDays) se dejan en null para
   * fechas históricas: reflejan estado ACTUAL no historizado (Project.status no guarda cuándo cambió,
   * ver §4.3) — no hay forma honesta de reconstruirlos para una fecha pasada a partir del estado de
   * hoy, así que no se fabrican. Solo la fila del día de hoy (escrita por runDailyAggregation) los trae.
   */
  async runHistoricalAggregation(snapshotDates: string[]): Promise<{ written: number }> {
    const sorted = [...snapshotDates].sort();
    let written = 0;

    // La serie de la Facultad (null) y una serie por departamento activo: los acumulativos se calculan con el
    // mismo filtro `programId` que usa la agregación diaria, así que cada serie es real para su departamento.
    const programs = await this.httpClient
      .get<{ id: string; isActive?: boolean }[]>('admin', '/internal/admin/programs')
      .catch(() => null);
    const scopes: (string | null)[] = [
      null,
      ...(Array.isArray(programs) ? programs : []).filter((p) => p.isActive !== false).map((p) => p.id),
    ];

    for (const programId of scopes) {
      const pid = programId ?? undefined;
      let previousDate: string | null = null;
      for (const dateStr of sorted) {
        const [projectStats, appStats, studentStats, companyStats] = await Promise.all([
          this.fetchProjectStats({ to: dateStr, programId: pid }),
          this.fetchApplicationStats({ to: dateStr, programId: pid }),
          this.fetchStudentStats(undefined, dateStr, pid),
          this.fetchCompanyStats(undefined, dateStr, pid),
        ]);

        const [projectStatsPeriod, studentStatsPeriod, companyStatsPeriod] = await Promise.all([
          this.fetchProjectStats({ from: previousDate ?? undefined, to: dateStr, programId: pid }),
          this.fetchStudentStats(previousDate ?? undefined, dateStr, pid),
          this.fetchCompanyStats(previousDate ?? undefined, dateStr, pid),
        ]);

        const totalUsers = (studentStats?.totalCreated ?? 0) + (companyStats?.totalCreated ?? 0);
        const newUsersPeriod = (studentStatsPeriod?.totalCreated ?? 0) + (companyStatsPeriod?.totalCreated ?? 0);

        await this.recordPlatformSnapshot(
          {
            totalUsers,
            totalStudents: studentStats?.totalCreated ?? 0,
            totalCompanies: companyStats?.totalCreated ?? 0,
            totalProjects: projectStats?.totalCreated ?? 0,
            totalApplications: appStats?.total ?? 0,
            // activeProjects se omite (no se fabrica 0): es un campo puntual sobre estado no
            // historizado, cae en el default de columna (0) que no debe leerse como "sabemos que era
            // cero", sino como "no calculado para esta fecha histórica" — ver comentario del método.
            avgMatchScore: null,
            avgTimeToFillDays: null,
            newUsersPeriod,
            newProjectsPeriod: projectStatsPeriod?.totalCreated ?? 0,
          },
          new Date(dateStr),
          programId,
        );

        if (programId === null) written += 1; // el conteo reporta las fechas (serie de la Facultad)
        previousDate = dateStr;
      }
    }

    this.logger.log(`Backfill histórico completado: ${written} fechas × ${scopes.length} series (Facultad + departamentos).`);
    return { written };
  }

  private async upsertSkillTrends(
    demand: Record<string, SkillAggregateEntry> | null,
    supply: Record<string, SkillAggregateEntry> | null,
    programId: string | null = null,
  ): Promise<void> {
    const keys = new Set([...Object.keys(demand ?? {}), ...Object.keys(supply ?? {})]);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    for (const key of keys) {
      const d = demand?.[key];
      const s = supply?.[key];
      const demandCount = d?.demandCount ?? 0;
      const supplyCount = s?.supplyCount ?? 0;
      const skillName = d?.name ?? s?.name ?? key;
      const catalogSkillId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
        ? key
        : null;
      // fórmula congelada: diferencia simple demanda-oferta (no hay normalización específica definida en §7)
      const gapIndex = demandCount - supplyCount;

      const previous = await this.skillTrendRepo.findOne({
        where: { skillName, snapshotDate: yesterday as any, programId: this.programWhere(programId) as any },
      });
      let trendDirection: 'rising' | 'stable' | 'declining' | null = null;
      if (previous?.gapIndex != null) {
        const prevGap = Number(previous.gapIndex);
        if (gapIndex > prevGap) trendDirection = 'rising';
        else if (gapIndex < prevGap) trendDirection = 'declining';
        else trendDirection = 'stable';
      }

      await this.upsertSkillTrend(skillName, {
        catalogSkillId,
        category: d?.category ?? s?.category ?? null,
        demandCount,
        supplyCount,
        gapIndex,
        avgProficiencyLevel: s?.avgProficiencyLevel ?? null,
        trendDirection,
      }, programId);
    }
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

  private toQueryString(params: Record<string, string | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`).join('&');
  }

  // ─── Fetchers a endpoints internos (contrato congelado §1.5) — todos con degradación controlada ──────

  private async fetchApplicationStats(params: {
    projectId?: string;
    companyId?: string;
    studentId?: string;
    programId?: string;
    from?: string;
    to?: string;
  }): Promise<ApplicationStats | null> {
    const qs = this.toQueryString(params);
    return this.httpClient
      .get<ApplicationStats>('application', `/internal/applications/analytics/stats${qs}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de aplicaciones: ${err.message}`);
        return null;
      });
  }

  private async fetchProjectStats(params: {
    companyId?: string;
    programId?: string;
    from?: string;
    to?: string;
  }): Promise<ProjectStats | null> {
    const qs = this.toQueryString(params);
    return this.httpClient
      .get<ProjectStats>('project', `/internal/projects/analytics/stats${qs}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de proyectos: ${err.message}`);
        return null;
      });
  }

  private async fetchStudentStats(from?: string, to?: string, programId?: string): Promise<StudentStats | null> {
    const qs = this.toQueryString({ from, to, programId });
    return this.httpClient
      .get<StudentStats>('student', `/internal/students/analytics/stats${qs}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de estudiantes: ${err.message}`);
        return null;
      });
  }

  private async fetchCompanyStats(from?: string, to?: string, programId?: string): Promise<CompanyStats | null> {
    const qs = this.toQueryString({ from, to, programId });
    return this.httpClient
      .get<CompanyStats>('company', `/internal/companies/analytics/stats${qs}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de empresas: ${err.message}`);
        return null;
      });
  }

  private async fetchMatchingStats(from?: string, to?: string): Promise<MatchingStats | null> {
    const qs = this.toQueryString({ from, to });
    return this.httpClient
      .get<MatchingStats>('matching', `/internal/matching/analytics/stats${qs}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de matching: ${err.message}`);
        return null;
      });
  }

  private async fetchEvaluationStats(params: {
    companyId?: string;
    studentId?: string;
    projectId?: string;
    from?: string;
    to?: string;
  }): Promise<EvaluationStats | null> {
    const qs = this.toQueryString(params);
    return this.httpClient
      .get<EvaluationStats>('evaluation', `/internal/evaluations/analytics/stats${qs}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de evaluaciones: ${err.message}`);
        return null;
      });
  }

  private async fetchSkillDemand(programId?: string): Promise<Record<string, SkillAggregateEntry> | null> {
    return this.httpClient
      .get<Record<string, SkillAggregateEntry>>('project', `/internal/projects/skills/demand${this.toQueryString({ programId })}`)
      .catch((err) => {
        this.logger.warn(`No se pudo obtener demanda de skills: ${err.message}`);
        return null;
      });
  }

  private async fetchSkillSupply(programId?: string): Promise<Record<string, SkillAggregateEntry> | null> {
    return this.httpClient
      .get<Record<string, SkillAggregateEntry>>('student', `/internal/students/skills/supply${this.toQueryString({ programId })}`)
      .catch((err) => {
        this.logger.warn(`No se pudo obtener oferta de skills: ${err.message}`);
        return null;
      });
  }

  private async fetchCompanyBasicInfo(
    userId: string,
  ): Promise<{ companyName: string; industry: string | null } | null> {
    return this.httpClient
      .get<{ companyName: string; industry: string | null }>('company', `/internal/companies/${userId}/basic-info`)
      .catch((err) => {
        this.logger.warn(`No se pudo obtener info básica de la empresa ${userId}: ${err.message}`);
        return null;
      });
  }

  private async fetchCompanyProjectIds(companyId: string): Promise<string[] | null> {
    return this.httpClient
      .get<string[]>('project', `/internal/projects/company/${companyId}`)
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener los proyectos de la empresa ${companyId}: ${err.message}`);
        return null;
      });
  }

  private async fetchUsersBasic(
    userIds: string[],
  ): Promise<{ userId: string; firstName: string; lastName: string }[]> {
    if (userIds.length === 0) return [];
    return this.httpClient
      .post<{ userId: string; firstName: string; lastName: string }[]>('user', '/internal/users/batch-basic', {
        userIds,
      })
      .catch((err) => {
        this.logger.warn(`No se pudieron obtener nombres de usuarios: ${err.message}`);
        return [];
      });
  }

  private weightedAverage(entries: { avg: number | null; count: number }[]): number | null {
    const valid = entries.filter((e) => e.avg !== null && e.count > 0);
    const totalCount = valid.reduce((sum, e) => sum + e.count, 0);
    if (totalCount === 0) return null;
    const totalScore = valid.reduce((sum, e) => sum + (e.avg as number) * e.count, 0);
    return Math.round((totalScore / totalCount) * 100) / 100;
  }

  private async buildReportData(dto: GenerateReportDto): Promise<Record<string, any>> {
    const scope: DepartmentScope | null = dto.programId ? { all: false, departmentId: dto.programId } : null;
    const query: MetricsQueryDto = {
      periodId: dto.periodId,
      programId: dto.programId,
      ...(dto.parameters?.from ? { from: dto.parameters.from } : {}),
      ...(dto.parameters?.to ? { to: dto.parameters.to } : {}),
    };

    switch (dto.reportType) {
      case 'period_summary': {
        const [platform, topSkills] = await Promise.all([
          this.getPlatformMetrics(query, scope),
          this.getTopDemandedSkills(10, scope),
        ]);
        return { platformMetrics: platform, topSkills, generatedAt: new Date() };
      }

      case 'skill_gap_analysis': {
        const skills = await this.getSkillTrends(query, scope);
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
        const platform = await this.getPlatformMetrics(query, scope);
        return {
          avgMatchScore: platform[0]?.avgMatchScore ?? null,
          avgTimeToFillDays: platform[0]?.avgTimeToFillDays ?? null,
          platformMetrics: platform,
          generatedAt: new Date(),
        };
      }

      case 'academic_process_summary': {
        const [assignmentStats, academicStats] = await this.getAcademicKpis(scope);
        return { assignmentStats, academicStats, generatedAt: new Date() };
      }

      case 'supervisor_workload': {
        const [assignmentStats] = await this.getAcademicKpis(scope);
        return {
          totalAssignments: assignmentStats?.totalAssignments ?? 0,
          byRole: assignmentStats?.byRole ?? {},
          avgAcceptanceHours: assignmentStats?.avgAcceptanceHours ?? null,
          supervisorWorkload: assignmentStats?.supervisorWorkload ?? [],
          generatedAt: new Date(),
        };
      }

      case 'project_completion_rates': {
        const [, academicStats] = await this.getAcademicKpis(scope);
        const total = academicStats?.totalRecords ?? 0;
        const completed = academicStats?.completedCount ?? 0;
        return {
          totalRecords: total,
          completedCount: completed,
          completionRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : null,
          byStatus: academicStats?.byStatus ?? {},
          avgDurationDays: academicStats?.avgDurationDays ?? null,
          avgAnteproyectoCorrections: academicStats?.avgAnteproyectoCorrections ?? null,
          generatedAt: new Date(),
        };
      }

      case 'company_performance': {
        // Reporte de UNA empresa puntual — entityId es el userId de la empresa (mismo id que
        // /analytics/companies/:companyId/summary). Requerido: sin entityId no hay forma honesta
        // de saber de qué empresa se habla, se rechaza en vez de caer a un agregado silencioso.
        if (!dto.entityId) {
          throw new Error('company_performance requiere entityId (userId de la empresa)');
        }
        const companyId = dto.entityId;
        const [basicInfo, projectStats, projectIds] = await Promise.all([
          this.fetchCompanyBasicInfo(companyId),
          this.fetchProjectStats({ companyId }),
          this.fetchCompanyProjectIds(companyId),
        ]);
        // Aplicaciones/evaluaciones no tienen companyId propio (ver auditoría §4.2 del planning) —
        // se resuelven en dos saltos: primero los projectIds reales de la empresa, después se
        // agregan las stats de esos proyectos uno por uno (volumen bajo a esta escala, ver §1.1).
        const ids = projectIds ?? [];
        const [appStatsPerProject, evalStatsPerProject] = await Promise.all([
          Promise.all(ids.map((projectId) => this.fetchApplicationStats({ projectId }))),
          Promise.all(ids.map((projectId) => this.fetchEvaluationStats({ projectId }))),
        ]);
        const totalApplicationsReceived = appStatsPerProject.reduce((sum, s) => sum + (s?.total ?? 0), 0);
        const acceptedCount = appStatsPerProject.reduce((sum, s) => sum + (s?.acceptedCount ?? 0), 0);
        const rejectedCount = appStatsPerProject.reduce((sum, s) => sum + (s?.rejectedCount ?? 0), 0);
        const evalEntries = evalStatsPerProject
          .filter((s): s is EvaluationStats => !!s && s.count > 0)
          .map((s) => ({ avg: s.avgOverallScore, count: s.count }));
        const avgEvaluationReceived = this.weightedAverage(evalEntries);
        const completedProjects = projectStats?.byStatus?.['completed'] ?? 0;
        const totalProjects = projectStats?.totalCreated ?? 0;
        return {
          scope: 'company',
          companyId,
          companyName: basicInfo?.companyName ?? null,
          industry: basicInfo?.industry ?? null,
          totalProjects,
          activeProjects: projectStats?.activeCount ?? 0,
          completedProjects,
          completionRate: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 10000) / 100 : null,
          projectsByStatus: projectStats?.byStatus ?? {},
          totalApplicationsReceived,
          acceptedCount,
          rejectedCount,
          conversionRate:
            totalApplicationsReceived > 0
              ? Math.round((acceptedCount / totalApplicationsReceived) * 10000) / 100
              : null,
          avgEvaluationReceived,
          generatedAt: new Date(),
        };
      }

      case 'student_outcomes': {
        // Reporte de UN estudiante puntual — entityId es el userId del estudiante.
        if (!dto.entityId) {
          throw new Error('student_outcomes requiere entityId (userId del estudiante)');
        }
        const studentId = dto.entityId;
        const [appStats, evalStats, matchingData] = await Promise.all([
          this.fetchApplicationStats({ studentId }),
          this.fetchEvaluationStats({ studentId }),
          this.httpClient
            .get<{ program?: string; skills: unknown[] }>('student', `/internal/students/${studentId}/matching-data`)
            .catch(() => null),
        ]);
        const [nameProfile] = await this.fetchUsersBasic([studentId]);
        const total = appStats?.total ?? 0;
        const completed = appStats?.byStatus?.['completed'] ?? 0;
        const receivedTypes = ['company_evaluates_student', 'supervisor_evaluates_student'];
        const avgEvaluationReceived = this.weightedAverage(
          receivedTypes.map((t) => evalStats?.byEvaluationType?.[t]).filter(Boolean) as {
            avg: number | null;
            count: number;
          }[],
        );
        return {
          scope: 'student',
          studentId,
          studentName: nameProfile ? `${nameProfile.firstName} ${nameProfile.lastName}`.trim() : null,
          program: matchingData?.program ?? null,
          skillsCount: matchingData?.skills?.length ?? 0,
          totalApplications: total,
          acceptedCount: appStats?.acceptedCount ?? 0,
          rejectedCount: appStats?.rejectedCount ?? 0,
          completedCount: completed,
          placementRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : null,
          avgTimeToDecisionHours: appStats?.avgTimeToDecisionHours ?? null,
          avgEvaluationReceived,
          generatedAt: new Date(),
        };
      }

      case 'supervisor_report': {
        // Reporte de UN docente/asesor puntual ("carga de estudiantes asignados") — entityId es
        // el Supervisor.id (PK de admin-service, no el userId — ver nota en admin.service.ts
        // getAssignmentStats() sobre esta distinción, la misma que causó el bug de nombres del
        // dashboard institucional corregido en esta sesión).
        if (!dto.entityId) {
          throw new Error('supervisor_report requiere entityId (Supervisor.id del docente)');
        }
        const supervisorId = dto.entityId;
        type SupervisorAssignmentRow = {
          id: string;
          studentId: string;
          projectId: string;
          role: string;
          status: string;
          acceptedAt: string | null;
        };
        const [supervisorInfo, assignments] = await Promise.all([
          this.httpClient
            .get<{ userId: string; department: string; role: string } | null>(
              'admin',
              `/internal/admin/supervisors/${supervisorId}`,
            )
            .catch(() => null),
          this.httpClient
            .get<SupervisorAssignmentRow[]>('admin', `/internal/admin/supervisors/${supervisorId}/assignments`)
            .catch((): SupervisorAssignmentRow[] => []),
        ]);

        const studentIds = [...new Set(assignments.map((a) => a.studentId))];
        const projectIds = [...new Set(assignments.map((a) => a.projectId))];
        const [supervisorName, studentProfiles, projects] = await Promise.all([
          supervisorInfo?.userId ? this.fetchUsersBasic([supervisorInfo.userId]) : Promise.resolve([]),
          studentIds.length ? this.fetchUsersBasic(studentIds) : Promise.resolve([]),
          projectIds.length
            ? this.httpClient
                .post<{ id: string; title: string }[]>('project', '/internal/projects/batch-basic', { projectIds })
                .catch(() => [])
            : Promise.resolve([]),
        ]);
        const studentNameMap = new Map(studentProfiles.map((s) => [s.userId, `${s.firstName} ${s.lastName}`.trim()]));
        const projectTitleMap = new Map(projects.map((p) => [p.id, p.title]));

        const activeStatuses = new Set(['accepted', 'active']);
        const activeAssignments = assignments.filter((a) => activeStatuses.has(a.status));
        const byRole: Record<string, number> = {};
        for (const a of assignments) byRole[a.role] = (byRole[a.role] ?? 0) + 1;

        return {
          scope: 'supervisor',
          supervisorId,
          supervisorName: supervisorName[0] ? `${supervisorName[0].firstName} ${supervisorName[0].lastName}`.trim() : null,
          department: supervisorInfo?.department ?? null,
          totalAssignments: assignments.length,
          activeAssignments: activeAssignments.length,
          byRole,
          assignments: assignments.map((a) => ({
            studentName: studentNameMap.get(a.studentId) ?? a.studentId,
            projectTitle: projectTitleMap.get(a.projectId) ?? a.projectId,
            role: a.role,
            status: a.status,
            acceptedAt: a.acceptedAt,
          })),
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

  /** KPIs académicos consultados on-demand a admin-service y application-service (sin duplicar estado). */
  async getAcademicKpis(scope: DepartmentScope | null = null, requestedProgramId?: string): Promise<[
    {
      totalAssignments: number;
      byRole: Record<string, number>;
      byStatus: Record<string, number>;
      avgAcceptanceHours: number | null;
      supervisorWorkload: { supervisorId: string; supervisorName: string | null; activeCount: number }[];
    } | null,
    {
      totalRecords: number;
      byStatus: Record<string, number>;
      completedCount: number;
      avgDurationDays: number | null;
      avgAnteproyectoCorrections: number | null;
    } | null,
  ]> {
    const qs = this.toQueryString({ programId: this.effectiveProgram(scope, requestedProgramId) ?? undefined });
    const [assignmentStats, academicStats] = await Promise.all([
      this.httpClient.get<any>('admin', `/internal/admin/assignments/stats${qs}`).catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de asignaciones: ${err.message}`);
        return null;
      }),
      this.httpClient.get<any>('application', `/internal/applications/academic-records/stats${qs}`).catch((err) => {
        this.logger.warn(`No se pudieron obtener estadísticas de registros académicos: ${err.message}`);
        return null;
      }),
    ]);

    return [assignmentStats, academicStats];
  }
}

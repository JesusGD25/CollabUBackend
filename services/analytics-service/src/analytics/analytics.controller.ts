import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  UserRole,
} from '@collab-u/shared';

import { AnalyticsService } from './analytics.service';
import { MetricsQueryDto, GenerateReportDto } from './dto';
import { buildReportPdf } from './pdf/report-pdf.builder';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Dashboard institucional con métricas generales' })
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('academic-kpis')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'KPIs del flujo académico: carga docente, tiempos de aceptación, tasas de completitud' })
  async getAcademicKpis() {
    const [assignmentStats, academicStats] = await this.analyticsService.getAcademicKpis();
    return { assignmentStats, academicStats };
  }

  @Post('aggregate/run')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Fuerza la agregación diaria fuera de horario (operación manual, además del cron de la 1am)' })
  async runAggregationNow() {
    await this.analyticsService.runDailyAggregation();
    return { message: 'Agregación ejecutada' };
  }

  @Post('aggregate/run-historical')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Backfill de platform_metrics para un conjunto de fechas históricas (FASE 5 — seed histórico)' })
  async runHistoricalAggregation(@Body() body: { dates: string[] }) {
    return this.analyticsService.runHistoricalAggregation(body.dates ?? []);
  }

  // ─── Platform Metrics ────────────────────────────────────────────────────────

  @Get('platform')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Métricas históricas de la plataforma' })
  getPlatformMetrics(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getPlatformMetrics(query);
  }

  // ─── Project Metrics ─────────────────────────────────────────────────────────

  @Get('projects/:projectId')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.COMPANY)
  @ApiOperation({ summary: 'Métricas históricas de un proyecto' })
  getProjectMetrics(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.analyticsService.getProjectMetrics(projectId, query);
  }

  @Get('projects/:projectId/summary')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.COMPANY)
  @ApiOperation({ summary: 'Resumen de métricas del proyecto (snapshot más reciente)' })
  getProjectMetricsSummary(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.analyticsService.getProjectMetricsSummary(projectId);
  }

  // ─── Student Metrics ─────────────────────────────────────────────────────────

  @Get('students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Métricas históricas de un estudiante' })
  getStudentMetrics(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: MetricsQueryDto,
    @CurrentUser() user: any,
  ) {
    // Estudiante solo puede ver sus propias métricas
    const id = user.role === UserRole.STUDENT ? user.id : studentId;
    return this.analyticsService.getStudentMetrics(id, query);
  }

  @Get('students/:studentId/summary')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Resumen de métricas del estudiante (snapshot más reciente)' })
  getStudentMetricsSummary(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @CurrentUser() user: any,
  ) {
    const id = user.role === UserRole.STUDENT ? user.id : studentId;
    return this.analyticsService.getStudentMetricsSummary(id);
  }

  // ─── Company Metrics ─────────────────────────────────────────────────────────

  @Get('companies/:companyId')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.COMPANY)
  @ApiOperation({ summary: 'Métricas históricas de una empresa' })
  getCompanyMetrics(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query() query: MetricsQueryDto,
    @CurrentUser() user: any,
  ) {
    const id = user.role === UserRole.COMPANY ? user.id : companyId;
    return this.analyticsService.getCompanyMetrics(id, query);
  }

  @Get('companies/:companyId/summary')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.COMPANY)
  @ApiOperation({ summary: 'Resumen de métricas de la empresa (snapshot más reciente)' })
  getCompanyMetricsSummary(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @CurrentUser() user: any,
  ) {
    const id = user.role === UserRole.COMPANY ? user.id : companyId;
    return this.analyticsService.getCompanyMetricsSummary(id);
  }

  // ─── Skill Trends ────────────────────────────────────────────────────────────

  @Get('skills/trends')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Tendencias de skills: demanda vs oferta' })
  getSkillTrends(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getSkillTrends(query);
  }

  @Get('skills/top')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Top 10 skills más demandados actualmente' })
  getTopDemandedSkills() {
    return this.analyticsService.getTopDemandedSkills(10);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  @Post('reports')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Generar un reporte analítico' })
  generateReport(@CurrentUser() user: any, @Body() dto: GenerateReportDto) {
    return this.analyticsService.generateReport(user.id, dto);
  }

  @Get('reports')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Listar reportes generados' })
  getReports(@Query() query: MetricsQueryDto) {
    return this.analyticsService.getReports(query);
  }

  @Get('reports/:id/pdf')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Descargar un reporte generado como PDF' })
  async downloadReportPdf(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const report = await this.analyticsService.getReport(id);
    const doc = buildReportPdf(report);
    const filename = `reporte-${report.reportType}-${report.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    doc.end();
  }

  @Get('reports/:id')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Obtener un reporte por ID' })
  getReport(@Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.getReport(id);
  }
}

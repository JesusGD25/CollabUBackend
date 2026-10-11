import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { SkillTrend } from './entities/skill-trend.entity';

/**
 * Mecanismo de actualización decidido en FASE 1 (§1.4 del planning): solo las métricas puntuales
 * sobre estado no historizado (platform_metrics, skill_trends) necesitan una captura periódica —
 * es la única forma de tener una serie temporal real, porque esas tablas fuente no guardan historial.
 * Las métricas acumulativas/de período se calculan bajo demanda en AnalyticsService y no dependen
 * de este job (ver getProjectMetricsSummary/getStudentMetricsSummary/getCompanyMetricsSummary).
 */
@Injectable()
export class AnalyticsCronService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectRepository(SkillTrend)
    private readonly skillTrendRepo: Repository<SkillTrend>,
  ) {}

  /**
   * EST-07: en un entorno recién sembrado, `skill_trends` está vacío hasta el primer cron
   * (1am) o una invocación manual de `POST /aggregate/run`. Sin esto, `/skills/top` devuelve
   * `[]` aunque el endpoint y la query sean correctos — no es un bug de query, es falta de
   * un primer disparo. Idempotente: solo corre si la tabla está vacía (mismo patrón que
   * `admin-service#onModuleInit`).
   */
  async onModuleInit(): Promise<void> {
    const count = await this.skillTrendRepo.count();
    if (count === 0) {
      this.logger.log('skill_trends vacío: ejecutando agregación inicial de analytics');
      try {
        await this.analyticsService.runDailyAggregation();
      } catch (err) {
        this.logger.error(`Agregación inicial falló: ${(err as Error).message}`, (err as Error).stack);
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async runDailySnapshot(): Promise<void> {
    this.logger.log('Iniciando snapshot diario de analytics...');
    try {
      await this.analyticsService.runDailyAggregation();
      this.logger.log('Snapshot diario completado.');
    } catch (err) {
      this.logger.error(`Snapshot diario falló: ${(err as Error).message}`, (err as Error).stack);
    }
  }
}

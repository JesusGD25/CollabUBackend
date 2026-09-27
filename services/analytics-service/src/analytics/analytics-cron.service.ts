import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AnalyticsService } from './analytics.service';

/**
 * Mecanismo de actualización decidido en FASE 1 (§1.4 del planning): solo las métricas puntuales
 * sobre estado no historizado (platform_metrics, skill_trends) necesitan una captura periódica —
 * es la única forma de tener una serie temporal real, porque esas tablas fuente no guardan historial.
 * Las métricas acumulativas/de período se calculan bajo demanda en AnalyticsService y no dependen
 * de este job (ver getProjectMetricsSummary/getStudentMetricsSummary/getCompanyMetricsSummary).
 */
@Injectable()
export class AnalyticsCronService {
  private readonly logger = new Logger(AnalyticsCronService.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

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

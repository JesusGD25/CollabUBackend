import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';

/**
 * Suscripciones del flujo académico. Por ahora solo registran actividad relevante
 * en logs — las métricas se calculan on-demand vía queries agregadas a los
 * servicios dueños de los datos (ver AnalyticsService.buildReportData), evitando
 * duplicar estado que ya vive en admin-service y application-service.
 */
@Injectable()
export class AnalyticsEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsEventsSubscriber.name);

  constructor(private readonly eventSubscriber: EventSubscriber) {}

  async onModuleInit() {
    await this.eventSubscriber.subscribe(
      'analytics-service.academic.completed',
      'academic.completed',
      async (event) => {
        this.logger.log(`Proyecto académico completado: aplicación ${event.data.applicationId}`);
      },
    );

    await this.eventSubscriber.subscribe(
      'analytics-service.admin.supervisor.declined',
      'admin.supervisor.declined',
      async (event) => {
        this.logger.log(`Asesor declinó asignación: ${event.data.assignmentId} (motivo: ${event.data.reason ?? 'sin especificar'})`);
      },
    );

    await this.eventSubscriber.subscribe(
      'analytics-service.academic.anteproyecto.expired',
      'academic.anteproyecto.expired',
      async (event) => {
        this.logger.warn(`Plazo de anteproyecto vencido: aplicación ${event.data.applicationId}`);
      },
    );
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { EvaluationService } from './evaluation.service';

/**
 * Suscriptor de eventos externos que dispara la creación automática de
 * evaluaciones cuando el proceso académico de una postulación se completa.
 *
 * Fuente del evento: application-service publica `academic.completed` con
 * los IDs de los participantes tras `uploadFinalGrade`.
 */
@Injectable()
export class EvaluationSubscriber implements OnModuleInit {
  private readonly logger = new Logger(EvaluationSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly evaluationService: EvaluationService,
  ) {}

  async onModuleInit() {
    await this.eventSubscriber.subscribe(
      'evaluation-service.academic.completed',
      'academic.completed',
      async (event) => {
        const {
          applicationId, projectId, projectTitle,
          studentId, companyUserId, asesorUserId,
        } = event.data ?? {};

        if (!applicationId || !projectId || !studentId) {
          this.logger.warn(
            `Evento academic.completed sin datos suficientes (applicationId=${applicationId}, projectId=${projectId}, studentId=${studentId})`,
          );
          return;
        }

        try {
          await this.evaluationService.createEvaluationsForCompletedProject({
            applicationId,
            projectId,
            projectTitle: projectTitle ?? null,
            studentId,
            companyUserId: companyUserId ?? null,
            asesorUserId: asesorUserId ?? null,
          });
        } catch (err: any) {
          this.logger.error(
            `Error auto-generando evaluaciones para application ${applicationId}: ${err.message}`,
            err.stack,
          );
        }
      },
    );
    this.logger.log('EvaluationSubscriber inicializado (academic.completed)');
  }
}

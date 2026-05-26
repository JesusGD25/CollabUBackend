import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { NotificationService } from './notification.service';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationSubscriber implements OnModuleInit {
  private readonly logger = new Logger(NotificationSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    // application.created → notify company (application_received)
    await this.eventSubscriber.subscribe(
      'notification-service.application.created',
      'application.created',
      async (event) => {
        const { companyUserId, studentName, projectTitle, applicationId, projectId } = event.data;
        if (!companyUserId) return;

        this.logger.log(`Evento recibido: application.created para empresa ${companyUserId}`);

        try {
          await this.notificationService.createSystemNotification(
            companyUserId,
            NotificationType.APPLICATION_RECEIVED,
            'Nueva postulación recibida',
            `${studentName || 'Un estudiante'} se ha postulado a tu proyecto "${projectTitle || 'sin título'}"`,
            { applicationId, projectId },
          );
        } catch (error: any) {
          this.logger.error(
            `Error creando notificación application.created: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // application.status.changed → notify student
    await this.eventSubscriber.subscribe(
      'notification-service.application.status.changed',
      'application.status.changed',
      async (event) => {
        const { studentUserId, status, projectTitle, applicationId, projectId } = event.data;
        if (!studentUserId) return;

        this.logger.log(`Evento recibido: application.status.changed para estudiante ${studentUserId}`);

        let type = NotificationType.APPLICATION_STATUS_CHANGED;
        let title = 'Tu postulación ha sido actualizada';
        let message = `El estado de tu postulación a "${projectTitle || 'sin título'}" ha cambiado a: ${status}`;

        if (status === 'accepted') {
          type = NotificationType.APPLICATION_ACCEPTED;
          title = '¡Tu postulación fue aceptada!';
          message = `¡Felicidades! Tu postulación a "${projectTitle || 'sin título'}" fue aceptada.`;
        } else if (status === 'rejected') {
          type = NotificationType.APPLICATION_REJECTED;
          title = 'Tu postulación fue rechazada';
          message = `Tu postulación a "${projectTitle || 'sin título'}" no fue seleccionada en esta ocasión.`;
        }

        try {
          await this.notificationService.createSystemNotification(
            studentUserId,
            type,
            title,
            message,
            { applicationId, projectId, status },
          );
        } catch (error: any) {
          this.logger.error(
            `Error creando notificación application.status.changed: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // evaluation.created → notify evaluator (evaluation_pending)
    await this.eventSubscriber.subscribe(
      'notification-service.evaluation.created',
      'evaluation.created',
      async (event) => {
        const { evaluatorId, evaluationId, projectTitle } = event.data;
        if (!evaluatorId) return;

        this.logger.log(`Evento recibido: evaluation.created para evaluador ${evaluatorId}`);

        try {
          await this.notificationService.createSystemNotification(
            evaluatorId,
            NotificationType.EVALUATION_PENDING,
            'Tienes una evaluación pendiente',
            `Se ha generado una evaluación pendiente para el proyecto "${projectTitle || 'sin título'}"`,
            { evaluationId },
          );
        } catch (error: any) {
          this.logger.error(
            `Error creando notificación evaluation.created: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // evaluation.completed → notify evaluated (evaluation_completed)
    await this.eventSubscriber.subscribe(
      'notification-service.evaluation.completed',
      'evaluation.completed',
      async (event) => {
        const { evaluatedId, evaluationId, projectTitle } = event.data;
        if (!evaluatedId) return;

        this.logger.log(`Evento recibido: evaluation.completed para evaluado ${evaluatedId}`);

        try {
          await this.notificationService.createSystemNotification(
            evaluatedId,
            NotificationType.EVALUATION_COMPLETED,
            'Nueva evaluación completada',
            `Se completó una evaluación sobre tu participación en "${projectTitle || 'sin título'}"`,
            { evaluationId },
          );
        } catch (error: any) {
          this.logger.error(
            `Error creando notificación evaluation.completed: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // matching.score.calculated → if isRecommended, notify user (match_recommendation)
    await this.eventSubscriber.subscribe(
      'notification-service.matching.score.calculated',
      'matching.score.calculated',
      async (event) => {
        const { studentUserId, isRecommended, projectTitle, matchResultId, projectId } = event.data;
        if (!studentUserId || !isRecommended) return;

        this.logger.log(`Evento recibido: matching.score.calculated (recomendado) para ${studentUserId}`);

        try {
          await this.notificationService.createSystemNotification(
            studentUserId,
            NotificationType.MATCH_RECOMMENDATION,
            '¡Nuevo proyecto recomendado para ti!',
            `El proyecto "${projectTitle || 'sin título'}" es compatible con tu perfil.`,
            { matchResultId, projectId },
          );
        } catch (error: any) {
          this.logger.error(
            `Error creando notificación matching.score.calculated: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // chat.message.sent → notify recipients (message_received)
    await this.eventSubscriber.subscribe(
      'notification-service.chat.message.sent',
      'chat.message.sent',
      async (event) => {
        const { senderId, content, conversationId, recipientIds } = event.data;
        if (!recipientIds || recipientIds.length === 0) return;

        this.logger.log(`Evento recibido: chat.message.sent de ${senderId} para destinatarios ${recipientIds.join(', ')}`);

        const title = 'Nuevo mensaje de chat';
        const message = content || 'Has recibido un nuevo mensaje.';

        for (const recipientId of recipientIds) {
          try {
            await this.notificationService.createSystemNotification(
              recipientId,
              NotificationType.MESSAGE_RECEIVED,
              title,
              message,
              { conversationId, senderId },
            );
          } catch (error: any) {
            this.logger.error(
              `Error creando notificación MESSAGE_RECEIVED para ${recipientId}: ${error.message}`,
              error.stack,
            );
          }
        }
      },
    );
  }
}

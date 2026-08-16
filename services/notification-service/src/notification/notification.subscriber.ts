import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber, MicroserviceHttpClient, UserRole } from '@collab-u/shared';
import { NotificationService } from './notification.service';
import { NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationSubscriber implements OnModuleInit {
  private readonly logger = new Logger(NotificationSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly notificationService: NotificationService,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  async onModuleInit() {
    // auth.email_verification.requested → correo con el enlace de verificación
    // (registro nuevo o reenvío). Email obligatorio: sin esto el usuario nunca
    // puede verificar su cuenta ni iniciar sesión.
    await this.eventSubscriber.subscribe(
      'notification-service.auth.email_verification.requested',
      'auth.email_verification.requested',
      async (event) => {
        const { userId, verifyUrl } = event.data;
        if (!userId || !verifyUrl) return;

        this.logger.log(`Evento recibido: auth.email_verification.requested para usuario ${userId}`);

        try {
          await this.notificationService.createSystemNotification(
            userId,
            NotificationType.EMAIL_VERIFICATION_REQUESTED,
            'Verifica tu correo electrónico',
            `Confirma tu cuenta de CollabU para poder iniciar sesión: <a href="${verifyUrl}">Verificar mi correo</a>. El enlace vence en 24 horas.`,
            { verifyUrl },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error notificando auth.email_verification.requested: ${error.message}`, error.stack);
        }
      },
    );

    // auth.password_reset.requested → correo con el enlace de restablecimiento.
    await this.eventSubscriber.subscribe(
      'notification-service.auth.password_reset.requested',
      'auth.password_reset.requested',
      async (event) => {
        const { userId, resetUrl } = event.data;
        if (!userId || !resetUrl) return;

        this.logger.log(`Evento recibido: auth.password_reset.requested para usuario ${userId}`);

        try {
          await this.notificationService.createSystemNotification(
            userId,
            NotificationType.PASSWORD_RESET_REQUESTED,
            'Restablece tu contraseña',
            `Solicitaste restablecer tu contraseña de CollabU: <a href="${resetUrl}">Restablecer contraseña</a>. Si no fuiste tú, ignora este correo. El enlace vence en 1 hora.`,
            { resetUrl },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error notificando auth.password_reset.requested: ${error.message}`, error.stack);
        }
      },
    );

    // project.submitted_for_review → notificar a todos los admins (email obligatorio)
    await this.eventSubscriber.subscribe(
      'notification-service.project.submitted_for_review',
      'project.submitted_for_review',
      async (event) => {
        const { projectId, title } = event.data;

        this.logger.log(`Evento recibido: project.submitted_for_review para proyecto ${projectId}`);

        let admins: { id: string; email: string }[] = [];
        try {
          admins = await this.httpClient.get<{ id: string; email: string }[]>(
            'auth',
            `/internal/auth/users/by-role/${UserRole.ADMIN}`,
          );
        } catch (error: any) {
          this.logger.error(`No se pudo obtener lista de admins: ${error.message}`, error.stack);
          return;
        }

        for (const admin of admins) {
          try {
            await this.notificationService.createSystemNotification(
              admin.id,
              NotificationType.PROJECT_SUBMITTED_FOR_REVIEW,
              'Nuevo proyecto pendiente de revisión',
              `El proyecto "${title || 'sin título'}" fue enviado a revisión y espera tu aprobación.`,
              { projectId },
              true, // forceEmail
            );
          } catch (error: any) {
            this.logger.error(
              `Error notificando a admin ${admin.id} sobre project.submitted_for_review: ${error.message}`,
              error.stack,
            );
          }
        }
      },
    );

    // project.faculty_approved → notificar a la empresa (email obligatorio)
    await this.eventSubscriber.subscribe(
      'notification-service.project.faculty_approved',
      'project.faculty_approved',
      async (event) => {
        const { projectId, companyId, title } = event.data;
        if (!companyId) return;

        this.logger.log(`Evento recibido: project.faculty_approved para empresa ${companyId}`);

        try {
          await this.notificationService.createSystemNotification(
            companyId,
            NotificationType.PROJECT_APPROVED,
            '¡Tu proyecto fue aprobado!',
            `La Facultad aprobó tu proyecto "${title || 'sin título'}". Ya está publicado y visible para estudiantes.`,
            { projectId },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación project.faculty_approved: ${error.message}`, error.stack);
        }
      },
    );

    // project.faculty_rejected → notificar a la empresa (email obligatorio)
    await this.eventSubscriber.subscribe(
      'notification-service.project.faculty_rejected',
      'project.faculty_rejected',
      async (event) => {
        const { projectId, companyId, title, categories, notes } = event.data;
        if (!companyId) return;

        this.logger.log(`Evento recibido: project.faculty_rejected para empresa ${companyId}`);

        const categoriesText = Array.isArray(categories) && categories.length > 0 ? categories.join(', ') : 'sin categoría';

        try {
          await this.notificationService.createSystemNotification(
            companyId,
            NotificationType.PROJECT_REJECTED,
            'Tu proyecto fue rechazado',
            `La Facultad rechazó tu proyecto "${title || 'sin título'}". Motivo: ${categoriesText}.${notes ? ` Observaciones: ${notes}` : ''}`,
            { projectId, categories, notes },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación project.faculty_rejected: ${error.message}`, error.stack);
        }
      },
    );

    // project.needs_changes → notificar a la empresa (email obligatorio)
    await this.eventSubscriber.subscribe(
      'notification-service.project.needs_changes',
      'project.needs_changes',
      async (event) => {
        const { projectId, companyId, title, notes } = event.data;
        if (!companyId) return;

        this.logger.log(`Evento recibido: project.needs_changes para empresa ${companyId}`);

        try {
          await this.notificationService.createSystemNotification(
            companyId,
            NotificationType.PROJECT_NEEDS_CHANGES,
            'Tu proyecto necesita ajustes',
            `La Facultad solicitó cambios en tu proyecto "${title || 'sin título'}": ${notes || 'sin detalle'}`,
            { projectId, notes },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación project.needs_changes: ${error.message}`, error.stack);
        }
      },
    );

    // admin.supervisor.assigned → notificar al docente (asesor o jurado)
    await this.eventSubscriber.subscribe(
      'notification-service.admin.supervisor.assigned',
      'admin.supervisor.assigned',
      async (event) => {
        const { supervisorUserId, role, projectId } = event.data;
        if (!supervisorUserId) return;

        const roleLabel = role === 'asesor' ? 'asesor' : 'jurado del anteproyecto';
        const title = role === 'asesor' ? 'Nueva asignación como asesor' : 'Nueva asignación como jurado';
        const message =
          role === 'asesor'
            ? 'Se te asignó como asesor de un proyecto académico. Debes aceptar o declinar la asignación.'
            : `Se te asignó como ${roleLabel} de un proyecto académico.`;

        try {
          await this.notificationService.createSystemNotification(
            supervisorUserId,
            NotificationType.SUPERVISOR_ASSIGNED,
            title,
            message,
            { projectId, role },
            true, // forceEmail
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación admin.supervisor.assigned: ${error.message}`, error.stack);
        }
      },
    );

    // admin.supervisor.accepted → notificar al admin que asignó y al estudiante
    await this.eventSubscriber.subscribe(
      'notification-service.admin.supervisor.accepted',
      'admin.supervisor.accepted',
      async (event) => {
        const { assignedBy, studentId, projectId } = event.data;

        try {
          if (assignedBy) {
            await this.notificationService.createSystemNotification(
              assignedBy,
              NotificationType.SUPERVISOR_ACCEPTED,
              'Asesor aceptó la asignación',
              'El docente asesor aceptó la asignación. El proyecto ha iniciado.',
              { projectId },
              true,
            );
          }
          if (studentId) {
            await this.notificationService.createSystemNotification(
              studentId,
              NotificationType.SUPERVISOR_ACCEPTED,
              '¡Tu proyecto ha iniciado!',
              'Tu asesor académico aceptó la asignación y tu proyecto ya está en curso.',
              { projectId },
              true,
            );
          }
        } catch (error: any) {
          this.logger.error(`Error creando notificación admin.supervisor.accepted: ${error.message}`, error.stack);
        }
      },
    );

    // admin.supervisor.declined → notificar al admin para reasignar
    await this.eventSubscriber.subscribe(
      'notification-service.admin.supervisor.declined',
      'admin.supervisor.declined',
      async (event) => {
        const { assignedBy, projectId, reason } = event.data;
        if (!assignedBy) return;

        try {
          await this.notificationService.createSystemNotification(
            assignedBy,
            NotificationType.SUPERVISOR_DECLINED,
            'El docente declinó la asignación',
            `Debes asignar un nuevo asesor. Motivo: ${reason || 'sin detalle'}`,
            { projectId, reason },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación admin.supervisor.declined: ${error.message}`, error.stack);
        }
      },
    );

    // admin.supervisor.replaced → notificar al nuevo asesor y al estudiante
    await this.eventSubscriber.subscribe(
      'notification-service.admin.supervisor.replaced',
      'admin.supervisor.replaced',
      async (event) => {
        const { newSupervisorUserId, studentId, projectId } = event.data;

        try {
          if (newSupervisorUserId) {
            await this.notificationService.createSystemNotification(
              newSupervisorUserId,
              NotificationType.SUPERVISOR_REPLACED,
              'Fuiste asignado como nuevo asesor',
              'La Facultad te asignó como nuevo asesor de un proyecto académico. Debes aceptar o declinar.',
              { projectId },
              true,
            );
          }
          if (studentId) {
            await this.notificationService.createSystemNotification(
              studentId,
              NotificationType.SUPERVISOR_REPLACED,
              'Tu asesor fue reemplazado',
              'La Facultad asignó un nuevo asesor para tu proyecto.',
              { projectId },
              true,
            );
          }
        } catch (error: any) {
          this.logger.error(`Error creando notificación admin.supervisor.replaced: ${error.message}`, error.stack);
        }
      },
    );

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

    // deliverable.assigned → notify student
    await this.eventSubscriber.subscribe(
      'notification-service.deliverable.assigned',
      'deliverable.assigned',
      async (event) => {
        const { studentId, title, dueDate, applicationId, projectId } = event.data;
        if (!studentId) return;

        this.logger.log(`Evento recibido: deliverable.assigned para estudiante ${studentId}`);

        try {
          await this.notificationService.createSystemNotification(
            studentId,
            NotificationType.DELIVERABLE_ASSIGNED,
            'Nuevo entregable asignado',
            `Se ha asignado un nuevo entregable: "${title || 'sin título'}". Fecha límite: ${dueDate ? new Date(dueDate).toLocaleDateString('es-ES') : 'no definida'}`,
            { applicationId, projectId },
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación deliverable.assigned: ${error.message}`, error.stack);
        }
      },
    );

    // deliverable.submitted → notify company and supervisor
    await this.eventSubscriber.subscribe(
      'notification-service.deliverable.submitted',
      'deliverable.submitted',
      async (event) => {
        const { companyUserId, supervisorUserId, title, applicationId, projectId } = event.data;

        try {
          if (companyUserId) {
            await this.notificationService.createSystemNotification(
              companyUserId,
              NotificationType.DELIVERABLE_SUBMITTED,
              'Entregable recibido',
              `El estudiante ha enviado un entregable: "${title || 'sin título'}"`,
              { applicationId, projectId },
            );
          }
          if (supervisorUserId) {
            await this.notificationService.createSystemNotification(
              supervisorUserId,
              NotificationType.DELIVERABLE_SUBMITTED,
              'Entregable recibido para revisión',
              `Un estudiante ha enviado un entregable que requiere revisión: "${title || 'sin título'}"`,
              { applicationId, projectId },
            );
          }
        } catch (error: any) {
          this.logger.error(`Error creando notificación deliverable.submitted: ${error.message}`, error.stack);
        }
      },
    );

    // deliverable.reviewed → notify student
    await this.eventSubscriber.subscribe(
      'notification-service.deliverable.reviewed',
      'deliverable.reviewed',
      async (event) => {
        const { studentId, status, title, applicationId, projectId } = event.data;
        if (!studentId) return;

        this.logger.log(`Evento recibido: deliverable.reviewed para estudiante ${studentId}`);

        const statusLabel: Record<string, string> = {
          approved: 'aprobado',
          rejected: 'rechazado',
          needs_revision: 'solicita revisión',
        };

        try {
          await this.notificationService.createSystemNotification(
            studentId,
            NotificationType.DELIVERABLE_FEEDBACK,
            'Tu entregable fue revisado',
            `Tu entregable "${title || 'sin título'}" ha sido ${statusLabel[status] || 'revisado'}`,
            { applicationId, projectId, status },
          );
        } catch (error: any) {
          this.logger.error(`Error creando notificación deliverable.reviewed: ${error.message}`, error.stack);
        }
      },
    );

    // academic.anteproyecto.* → asesor + jurado(s) + estudiante (email obligatorio)
    await this.eventSubscriber.subscribe(
      'notification-service.academic.anteproyecto.submitted',
      'academic.anteproyecto.submitted',
      async (event) => {
        const { asesorUserId, juradoUserIds, projectTitle, applicationId } = event.data;
        const recipients = [asesorUserId, ...(juradoUserIds ?? [])].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.ANTEPROYECTO_SUBMITTED,
              'Anteproyecto entregado',
              `El estudiante entregó el anteproyecto del proyecto "${projectTitle ?? ''}" para revisión.`,
              { applicationId },
              true,
            );
          } catch (error: any) {
            this.logger.error(`Error notificando anteproyecto.submitted a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.anteproyecto.revised',
      'academic.anteproyecto.revised',
      async (event) => {
        const { asesorUserId, juradoUserIds, projectTitle, applicationId } = event.data;
        const recipients = [asesorUserId, ...(juradoUserIds ?? [])].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.ANTEPROYECTO_SUBMITTED,
              'Anteproyecto re-entregado',
              `El estudiante corrigió y volvió a entregar el anteproyecto del proyecto "${projectTitle ?? ''}".`,
              { applicationId },
              true,
            );
          } catch (error: any) {
            this.logger.error(`Error notificando anteproyecto.revised a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.anteproyecto.correction_requested',
      'academic.anteproyecto.correction_requested',
      async (event) => {
        const { studentId, comment, applicationId } = event.data;
        if (!studentId) return;
        try {
          await this.notificationService.createSystemNotification(
            studentId,
            NotificationType.ANTEPROYECTO_CORRECTION_REQUESTED,
            'Corrección solicitada en tu anteproyecto',
            `El jurado solicitó una corrección: ${comment ?? ''}`,
            { applicationId },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error notificando corrección de anteproyecto: ${error.message}`, error.stack);
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.anteproyecto.approved',
      'academic.anteproyecto.approved',
      async (event) => {
        const { studentId, asesorUserId, projectTitle, applicationId } = event.data;
        const recipients = [studentId, asesorUserId].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.ANTEPROYECTO_APPROVED,
              'Anteproyecto aprobado',
              `El anteproyecto del proyecto "${projectTitle ?? ''}" fue aprobado por el jurado.`,
              { applicationId },
              true,
            );
          } catch (error: any) {
            this.logger.error(`Error notificando aprobación de anteproyecto a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.anteproyecto.rejected',
      'academic.anteproyecto.rejected',
      async (event) => {
        const { studentId, comment, applicationId } = event.data;
        if (!studentId) return;
        try {
          await this.notificationService.createSystemNotification(
            studentId,
            NotificationType.ANTEPROYECTO_REJECTED,
            'Anteproyecto rechazado',
            `El jurado rechazó el anteproyecto: ${comment ?? ''}`,
            { applicationId },
            true,
          );
        } catch (error: any) {
          this.logger.error(`Error notificando rechazo de anteproyecto: ${error.message}`, error.stack);
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.anteproyecto.deadline_extended',
      'academic.anteproyecto.deadline_extended',
      async (event) => {
        const { studentId, asesorUserId, juradoUserIds, target, newDeadline, applicationId } = event.data;
        const recipients = [studentId, asesorUserId, ...(juradoUserIds ?? [])].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.DEADLINE_EXTENDED,
              'Plazo extendido',
              `Se extendió el plazo de ${target === 'review' ? 'revisión del jurado' : 'respuesta del estudiante'} hasta ${newDeadline}.`,
              { applicationId },
            );
          } catch (error: any) {
            this.logger.error(`Error notificando extensión de plazo a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );

    // academic.agreement.uploaded → estudiante + empresa + asesor (email obligatorio)
    await this.eventSubscriber.subscribe(
      'notification-service.academic.agreement.uploaded',
      'academic.agreement.uploaded',
      async (event) => {
        const { studentId, companyUserId, asesorUserId, projectTitle, applicationId, officialStartDate } = event.data;
        const recipients = [studentId, companyUserId, asesorUserId].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.AGREEMENT_UPLOADED,
              'Acuerdo de iniciación cargado',
              `Se cargó el acuerdo de iniciación del proyecto "${projectTitle ?? ''}" — inicio oficial: ${officialStartDate}.`,
              { applicationId },
              true,
            );
          } catch (error: any) {
            this.logger.error(`Error notificando acuerdo de iniciación a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.finalization.started',
      'academic.finalization.started',
      async (event) => {
        const { studentId, companyUserId, asesorUserId, projectTitle, applicationId } = event.data;
        const recipients = [studentId, companyUserId, asesorUserId].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.FINALIZATION_STARTED,
              'Inicia la fase de finalización',
              `El proyecto "${projectTitle ?? ''}" entró en fase de finalización — se requieren documentos finales.`,
              { applicationId },
            );
          } catch (error: any) {
            this.logger.error(`Error notificando inicio de finalización a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.progress.near_completion',
      'academic.progress.near_completion',
      async (event) => {
        const { asesorUserId, projectTitle, applicationId, temporalProgress } = event.data;
        if (!asesorUserId) return;
        try {
          await this.notificationService.createSystemNotification(
            asesorUserId,
            NotificationType.PROGRESS_NEAR_COMPLETION,
            'Proyecto cerca de finalizar',
            `El proyecto "${projectTitle ?? ''}" alcanzó ${temporalProgress}% del tiempo acordado — considera iniciar la finalización.`,
            { applicationId },
          );
        } catch (error: any) {
          this.logger.error(`Error notificando progreso cercano a completar: ${error.message}`, error.stack);
        }
      },
    );

    await this.eventSubscriber.subscribe(
      'notification-service.academic.completed',
      'academic.completed',
      async (event) => {
        const { studentId, companyUserId, asesorUserId, projectTitle, applicationId } = event.data;
        const recipients = [studentId, companyUserId, asesorUserId].filter(Boolean);
        for (const userId of recipients) {
          try {
            await this.notificationService.createSystemNotification(
              userId,
              NotificationType.ACADEMIC_COMPLETED,
              'Proyecto completado',
              `El proyecto "${projectTitle ?? ''}" fue marcado como completado. Ya puedes registrar tus evaluaciones.`,
              { applicationId },
              true,
            );
          } catch (error: any) {
            this.logger.error(`Error notificando finalización de proyecto a ${userId}: ${error.message}`, error.stack);
          }
        }
      },
    );
  }
}

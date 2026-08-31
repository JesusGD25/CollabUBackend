import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber, DomainEvent, MicroserviceHttpClient } from '@collab-u/shared';
import { ChatService } from './chat.service';
import { ConversationType } from './entities/conversation.entity';
import { MessageType } from './entities/message.entity';

@Injectable()
export class ChatEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ChatEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly chatService: ChatService,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  onModuleInit() {
    this.subscribeToApplicationAccepted();
    this.subscribeToSupervisorAccepted();
    this.subscribeToJuradoAssigned();
    this.subscribeToJuradoDisconnected();
  }

  private async getCompanyUserId(projectId: string): Promise<string | null> {
    try {
      const projects = await this.httpClient.post<{ createdByUserId: string }[]>(
        'project',
        '/internal/projects/batch-basic',
        { projectIds: [projectId] },
      );
      return projects[0]?.createdByUserId ?? null;
    } catch (err: any) {
      this.logger.warn(`No se pudo resolver companyUserId del proyecto ${projectId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Al aceptar el asesor su asignación, crear los 3 canales que dependen de esa
   * confirmación: asesor-estudiante, asesor-empresa y el grupo del proyecto.
   */
  private subscribeToSupervisorAccepted() {
    this.eventSubscriber.subscribe(
      'chat-service.admin.supervisor.accepted',
      'admin.supervisor.accepted',
      async (event: DomainEvent) => {
        const { supervisorUserId, studentId, projectId } = event.data as {
          supervisorUserId: string;
          studentId: string;
          projectId: string;
        };
        if (!supervisorUserId || !studentId || !projectId) return;

        const companyUserId = await this.getCompanyUserId(projectId);

        try {
          await this.chatService.createConversation(supervisorUserId, {
            type: ConversationType.DIRECT,
            participantIds: [studentId],
            initialMessage: 'Hola, soy tu asesor asignado para este proyecto. Cualquier duda, aquí estoy.',
          });
        } catch (err: any) {
          this.logger.error(`Error creando canal asesor-estudiante: ${err.message}`, err.stack);
        }

        if (companyUserId) {
          try {
            await this.chatService.createConversation(supervisorUserId, {
              type: ConversationType.DIRECT,
              participantIds: [companyUserId],
              initialMessage: 'Hola, soy el asesor académico asignado para este proyecto.',
            });
          } catch (err: any) {
            this.logger.error(`Error creando canal asesor-empresa: ${err.message}`, err.stack);
          }

          try {
            const existing = await this.chatService.findConversationByProjectAndName(projectId, 'Equipo del proyecto');
            if (existing) {
              await this.chatService.addParticipantIfMissing(existing.id, supervisorUserId);
            } else {
              await this.chatService.createConversation(supervisorUserId, {
                type: ConversationType.GROUP,
                name: 'Equipo del proyecto',
                projectId,
                participantIds: [studentId, companyUserId],
                initialMessage: 'Canal del equipo — estudiante, empresa y asesor académico.',
              });
            }
          } catch (err: any) {
            this.logger.error(`Error creando canal grupal del proyecto: ${err.message}`, err.stack);
          }
        }

        // Canal privado con el/los jurado(s) de anteproyecto ya asignados (si los hay).
        try {
          const assignments = await this.httpClient.get<{ supervisorUserId: string; role: string; status: string }[]>(
            'admin',
            `/internal/admin/assignments/by-application/${(event.data as any).applicationId}`,
          );
          const juradoUserIds = assignments
            .filter((a) => a.role === 'jurado_anteproyecto' && a.status === 'accepted')
            .map((a) => a.supervisorUserId);

          if (juradoUserIds.length > 0) {
            const existing = await this.chatService.findConversationByProjectAndName(projectId, 'Asesor y jurado — anteproyecto');
            if (existing) {
              for (const juradoUserId of juradoUserIds) {
                await this.chatService.addParticipantIfMissing(existing.id, juradoUserId);
              }
              await this.chatService.addParticipantIfMissing(existing.id, supervisorUserId);
            } else {
              await this.chatService.createConversation(supervisorUserId, {
                type: ConversationType.GROUP,
                name: 'Asesor y jurado — anteproyecto',
                projectId,
                participantIds: juradoUserIds,
                initialMessage: 'Canal privado para coordinar la revisión del anteproyecto.',
              });
            }
          }
        } catch (err: any) {
          this.logger.error(`Error creando canal asesor-jurado: ${err.message}`, err.stack);
        }
      },
    );
  }

  /**
   * Al asignar un jurado de anteproyecto DESPUÉS de que el asesor ya aceptó
   * (caso de reemplazo o jurado tardío), se agrega al canal ya existente.
   * Si el asesor aún no ha aceptado, el canal se crea recién en ese momento
   * (ver subscribeToSupervisorAccepted), que ya incluye a los jurados activos.
   */
  private subscribeToJuradoAssigned() {
    this.eventSubscriber.subscribe(
      'chat-service.admin.supervisor.assigned.jurado',
      'admin.supervisor.assigned',
      async (event: DomainEvent) => {
        const { supervisorUserId, projectId, role } = event.data as {
          supervisorUserId: string;
          projectId: string;
          role: string;
        };
        if (role !== 'jurado_anteproyecto' || !supervisorUserId || !projectId) return;

        try {
          const existing = await this.chatService.findConversationByProjectAndName(projectId, 'Asesor y jurado — anteproyecto');
          if (existing) {
            await this.chatService.addParticipantIfMissing(existing.id, supervisorUserId);
          }
        } catch (err: any) {
          this.logger.error(`Error agregando jurado al canal asesor-jurado: ${err.message}`, err.stack);
        }
      },
    );
  }

  /** Al desvincularse el jurado (anteproyecto aprobado), cerrar el canal asesor-jurado. */
  private subscribeToJuradoDisconnected() {
    this.eventSubscriber.subscribe(
      'chat-service.admin.jurado.disconnected',
      'admin.jurado.disconnected',
      async (event: DomainEvent) => {
        const { projectId } = event.data as { projectId: string };
        if (!projectId) return;

        try {
          const existing = await this.chatService.findConversationByProjectAndName(projectId, 'Asesor y jurado — anteproyecto');
          if (existing) {
            await this.chatService.closeConversation(existing.id);
            this.logger.log(`Canal asesor-jurado cerrado para proyecto ${projectId}`);
          }
        } catch (err: any) {
          this.logger.error(`Error cerrando canal asesor-jurado: ${err.message}`, err.stack);
        }
      },
    );
  }

  /**
   * Cuando una postulación es aceptada, crear automáticamente una conversación
   * entre el estudiante y la empresa (si no existe una ya).
   */
  private subscribeToApplicationAccepted() {
    this.eventSubscriber.subscribe(
      'chat-service.application.status.changed',
      'application.status.changed',
      async (event: DomainEvent) => {
        const { status, studentUserId, companyUserId, applicationId, projectTitle } =
          event.data as {
            status: string;
            studentUserId: string;
            companyUserId: string;
            applicationId: string;
            projectTitle: string;
          };

        if (status !== 'accepted' || !studentUserId || !companyUserId) return;

        this.logger.log(
          `Creando conversación automática para postulación aceptada: ${applicationId}`,
        );

        try {
          await this.chatService.createConversation(companyUserId, {
            type: ConversationType.DIRECT,
            participantIds: [studentUserId],
            initialMessage: `¡Hola! Tu postulación al proyecto "${projectTitle || 'nuestro proyecto'}" ha sido aceptada. Estamos emocionados de trabajar contigo.`,
          });
          this.logger.log(
            `Conversación creada automáticamente para aplicación aceptada ${applicationId}`,
          );
        } catch (err: any) {
          this.logger.error(
            `Error creando conversación automática: ${err.message}`,
            err.stack,
          );
        }
      },
    );
  }
}

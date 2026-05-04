import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber, DomainEvent } from '@collab-u/shared';
import { ChatService } from './chat.service';
import { ConversationType } from './entities/conversation.entity';
import { MessageType } from './entities/message.entity';

@Injectable()
export class ChatEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ChatEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly chatService: ChatService,
  ) {}

  onModuleInit() {
    this.subscribeToApplicationAccepted();
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

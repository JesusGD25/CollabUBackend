import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber, DomainEvent } from '@collab-u/shared';
import { ApplicationService } from './application.service';

@Injectable()
export class ApplicationEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ApplicationEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly applicationService: ApplicationService,
  ) {}

  onModuleInit() {
    this.subscribeToUserDeactivated();
  }

  private subscribeToUserDeactivated() {
    this.eventSubscriber.subscribe(
      'application-service.auth.user.deactivated',
      'auth.user.deactivated',
      async (event: DomainEvent) => {
        const userId = (event.data as { userId: string }).userId;
        this.logger.log(`Usuario desactivado: ${userId}. Retirando postulaciones activas.`);
        try {
          await this.applicationService.withdrawAllByStudent(userId);
          this.logger.log(
            `Postulaciones retiradas correctamente para usuario ${userId}`,
          );
        } catch (err) {
          this.logger.error(
            `Error al retirar postulaciones del usuario ${userId}: ${err.message}`,
          );
        }
      },
    );
  }
}

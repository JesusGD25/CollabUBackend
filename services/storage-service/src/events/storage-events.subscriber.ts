import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class StorageEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(StorageEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit() {
    // Cuando se crea un usuario → inicializar cuota de almacenamiento
    await this.eventSubscriber.subscribe(
      'storage-service.auth.user.created',
      'auth.user.created',
      async (event) => {
        const { userId, role } = event.data;
        this.logger.log(`Evento recibido: auth.user.created para ${userId} (${role})`);

        try {
          await this.storageService.initializeQuota(userId, role);
          this.logger.log(`Cuota de almacenamiento inicializada para: ${userId}`);
        } catch (error: any) {
          this.logger.error(
            `Error inicializando cuota para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}

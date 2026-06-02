import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { AdminService } from './admin.service';

@Injectable()
export class AdminEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(AdminEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly adminService: AdminService,
  ) {}

  async onModuleInit() {
    await this.eventSubscriber.subscribe(
      'admin-service.auth.user.verified',
      'auth.user.verified',
      async (event) => {
        const { userId, role } = event.data;

        if (role !== 'faculty') {
          this.logger.debug(`Evento auth.user.verified ignorado: rol=${role}`);
          return;
        }

        this.logger.log(`Evento recibido: auth.user.verified para docente ${userId}`);

        try {
          await this.adminService.createSupervisor({ userId });
          this.logger.log(`Perfil de supervisor creado para: ${userId}`);
        } catch (error: any) {
          if (error.status === 409) {
            this.logger.warn(`Supervisor ya existe para ${userId}, ignorando`);
            return;
          }
          this.logger.error(
            `Error creando perfil de supervisor para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}
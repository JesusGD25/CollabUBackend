import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { UsersService } from '../users/users.service';

@Injectable()
export class UserEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(UserEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    // Escuchar evento auth.user.created → crear perfil base automáticamente
    await this.eventSubscriber.subscribe(
      'user-service.auth.user.created',
      'auth.user.created',
      async (event) => {
        const { userId, email, role } = event.data;
        this.logger.log(`Evento recibido: auth.user.created para ${email} [${userId}]`);

        try {
          await this.usersService.createProfile({
            userId,
            role,
            firstName: '',
            lastName: '',
          });
          this.logger.log(`Perfil base creado automáticamente para: ${userId}`);
        } catch (error: any) {
          this.logger.error(
            `Error creando perfil para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}

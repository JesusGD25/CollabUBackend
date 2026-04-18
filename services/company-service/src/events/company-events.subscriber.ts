import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { CompanyService } from '../company/company.service';
import { VerificationStatus } from '../company/entities/company-profile.entity';

@Injectable()
export class CompanyEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(CompanyEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly companyService: CompanyService,
  ) {}

  async onModuleInit() {
    // Cuando se crea un usuario con rol company → crear perfil base
    await this.eventSubscriber.subscribe(
      'company-service.auth.user.created',
      'auth.user.created',
      async (event) => {
        const { userId, role } = event.data;

        if (role !== 'company') {
          this.logger.debug(`Evento auth.user.created ignorado: rol=${role}`);
          return;
        }

        this.logger.log(`Evento recibido: auth.user.created para empresa ${userId}`);

        try {
          await this.companyService.createProfile({
            userId,
            companyName: 'Empresa pendiente de configurar',
          });
          this.logger.log(`Perfil de empresa base creado para: ${userId}`);
        } catch (error: any) {
          if (error.status === 409) {
            this.logger.warn(`Perfil ya existe para ${userId}, ignorando`);
            return;
          }
          this.logger.error(
            `Error creando perfil de empresa para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Cuando admin verifica una empresa → actualizar estado
    await this.eventSubscriber.subscribe(
      'company-service.admin.company.verified',
      'admin.company.verified',
      async (event) => {
        const { userId, status } = event.data;
        this.logger.log(`Evento recibido: admin.company.verified para ${userId} -> ${status}`);

        try {
          const verificationStatus = status as VerificationStatus;
          await this.companyService.updateVerificationStatus(userId, verificationStatus);
          this.logger.log(`Estado de verificación actualizado para: ${userId}`);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.debug(`No hay perfil de empresa para ${userId}`);
            return;
          }
          this.logger.error(
            `Error actualizando verificación de ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Cuando se desactiva un usuario → desactivar perfil
    await this.eventSubscriber.subscribe(
      'company-service.auth.user.deactivated',
      'auth.user.deactivated',
      async (event) => {
        const { userId } = event.data;
        this.logger.log(`Evento recibido: auth.user.deactivated para ${userId}`);

        try {
          await this.companyService.updateProfile(userId, { isActive: false } as any);
          this.logger.log(`Perfil desactivado para usuario: ${userId}`);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.debug(`No hay perfil de empresa para ${userId}`);
            return;
          }
          this.logger.error(
            `Error desactivando perfil de ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}

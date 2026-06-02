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
    // Escuchar evento auth.user.verified → crear perfil base automáticamente
    await this.eventSubscriber.subscribe(
      'user-service.auth.user.verified',
      'auth.user.verified',
      async (event) => {
        const { userId, email, role } = event.data;
        this.logger.log(`Evento recibido: auth.user.verified para ${email} [${userId}]`);

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

    // Escuchar progreso del perfil de estudiante para actualizar onboarding en user-service
    await this.eventSubscriber.subscribe(
      'user-service.student.profile.updated',
      'student.profile.updated',
      async (event) => {
        const { userId, isOnboardingReady } = event.data;

        if (typeof userId !== 'string' || typeof isOnboardingReady !== 'boolean') {
          this.logger.warn('student.profile.updated recibido sin payload de onboarding válido');
          return;
        }

        try {
          await this.usersService.setOnboardingStatus(userId, isOnboardingReady);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.warn(`Perfil base no encontrado para ${userId}; onboarding student omitido`);
            return;
          }
          this.logger.error(
            `Error actualizando onboarding (student) para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Escuchar progreso del perfil de empresa para actualizar onboarding en user-service
    await this.eventSubscriber.subscribe(
      'user-service.company.profile.updated',
      'company.profile.updated',
      async (event) => {
        const { userId, isOnboardingReady } = event.data;

        if (typeof userId !== 'string' || typeof isOnboardingReady !== 'boolean') {
          this.logger.warn('company.profile.updated recibido sin payload de onboarding válido');
          return;
        }

        try {
          await this.usersService.setOnboardingStatus(userId, isOnboardingReady);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.warn(`Perfil base no encontrado para ${userId}; onboarding company omitido`);
            return;
          }
          this.logger.error(
            `Error actualizando onboarding (company) para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Escuchar progreso del perfil de faculty para actualizar onboarding en user-service
    await this.eventSubscriber.subscribe(
      'user-service.faculty.profile.updated',
      'faculty.profile.updated',
      async (event) => {
        const { userId, isOnboardingReady } = event.data;

        if (typeof userId !== 'string' || typeof isOnboardingReady !== 'boolean') {
          this.logger.warn('faculty.profile.updated recibido sin payload de onboarding válido');
          return;
        }

        try {
          await this.usersService.setOnboardingStatus(userId, isOnboardingReady);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.warn(`Perfil base no encontrado para ${userId}; onboarding faculty omitido`);
            return;
          }
          this.logger.error(
            `Error actualizando onboarding (faculty) para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}

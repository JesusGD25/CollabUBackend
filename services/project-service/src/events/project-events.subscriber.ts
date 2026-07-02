import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { ProjectService } from '../project/project.service';
import { ProjectStatus } from '../project/entities/project.entity';

@Injectable()
export class ProjectEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(ProjectEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly projectService: ProjectService,
  ) {}

  async onModuleInit() {
    // Cuando una empresa es desactivada → desactivar sus proyectos
    await this.eventSubscriber.subscribe(
      'project-service.company.deactivated',
      'company.profile.deactivated',
      async (event) => {
        const { companyId } = event.data;
        this.logger.log(`Evento recibido: company.profile.deactivated para ${companyId}`);

        try {
          // Se manejaría desactivación masiva — por ahora log
          this.logger.log(`Proyectos de empresa ${companyId} pendientes de desactivación`);
        } catch (error: any) {
          this.logger.error(
            `Error procesando desactivación de empresa ${companyId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Cuando se acepta una postulación → incrementar posiciones ocupadas
    await this.eventSubscriber.subscribe(
      'project-service.application.accepted',
      'application.status.changed',
      async (event) => {
        const { projectId, newStatus } = event.data;

        if (newStatus !== 'accepted') {
          return;
        }

        this.logger.log(`Evento recibido: postulación aceptada para proyecto ${projectId}`);

        try {
          await this.projectService.incrementApplications(projectId);
          this.logger.log(`Contador de postulaciones incrementado para proyecto ${projectId}`);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.debug(`Proyecto ${projectId} no encontrado`);
            return;
          }
          this.logger.error(
            `Error incrementando aplicaciones para ${projectId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Cuando un usuario es desactivado → cancelar proyectos draft
    await this.eventSubscriber.subscribe(
      'project-service.auth.user.deactivated',
      'auth.user.deactivated',
      async (event) => {
        const { userId } = event.data;
        this.logger.log(`Evento recibido: auth.user.deactivated para ${userId}`);

        try {
          this.logger.log(`Proyectos del usuario ${userId} pendientes de revisión`);
        } catch (error: any) {
          this.logger.error(
            `Error procesando desactivación de usuario ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}

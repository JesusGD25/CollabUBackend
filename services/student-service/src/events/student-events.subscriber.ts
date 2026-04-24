import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '@collab-u/shared';
import { StudentService } from '../student/student.service';

@Injectable()
export class StudentEventsSubscriber implements OnModuleInit {
  private readonly logger = new Logger(StudentEventsSubscriber.name);

  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly studentService: StudentService,
  ) {}

  async onModuleInit() {
    // Cuando se verifica un usuario con rol student → crear perfil base
    await this.eventSubscriber.subscribe(
      'student-service.auth.user.verified',
      'auth.user.verified',
      async (event) => {
        const { userId, role } = event.data;

        if (role !== 'student') {
          this.logger.debug(`Evento auth.user.verified ignorado: rol=${role}`);
          return;
        }

        this.logger.log(`Evento recibido: auth.user.verified para estudiante ${userId}`);

        try {
          await this.studentService.createProfile({
            userId,
            program: '',
            semester: 1,
          });
          this.logger.log(`Perfil de estudiante base creado para: ${userId}`);
        } catch (error: any) {
          if (error.status === 409) {
            this.logger.warn(`Perfil ya existe para ${userId}, ignorando`);
            return;
          }
          this.logger.error(
            `Error creando perfil de estudiante para ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );

    // Cuando se desactiva un usuario → ocultar perfil
    await this.eventSubscriber.subscribe(
      'student-service.auth.user.deactivated',
      'auth.user.deactivated',
      async (event) => {
        const { userId } = event.data;
        this.logger.log(`Evento recibido: auth.user.deactivated para ${userId}`);

        try {
          await this.studentService.updateProfile(userId, { isVisible: false });
          this.logger.log(`Perfil ocultado para usuario desactivado: ${userId}`);
        } catch (error: any) {
          if (error.status === 404) {
            this.logger.debug(`No hay perfil de estudiante para ${userId}`);
            return;
          }
          this.logger.error(
            `Error ocultando perfil de ${userId}: ${error.message}`,
            error.stack,
          );
        }
      },
    );
  }
}

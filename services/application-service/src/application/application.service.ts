import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Application, ApplicationStatus } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview, InterviewStatus, InterviewType } from './entities/interview.entity';
import { StudentDeliverable, DeliverableStatus } from './entities/student-deliverable.entity';

import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  WithdrawApplicationDto,
  ScheduleInterviewDto,
  CompleteInterviewDto,
  CancelInterviewDto,
  RescheduleInterviewDto,
  SubmitDeliverableDto,
  ReviewDeliverableDto,
  ApplicationQueryDto,
} from './dto';

/** Transiciones de estado permitidas para la empresa */
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.SHORTLISTED]: [
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.INTERVIEW]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.ACCEPTED]: [ApplicationStatus.COMPLETED],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
  [ApplicationStatus.COMPLETED]: [],
};

export interface PaginatedApplicationsResponse {
  data: Application[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ApplicationService {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ApplicationTimeline)
    private readonly timelineRepo: Repository<ApplicationTimeline>,
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @InjectRepository(StudentDeliverable)
    private readonly deliverableRepo: Repository<StudentDeliverable>,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // POSTULACIONES
  // ──────────────────────────────────────────────────────────────────

  async createApplication(
    studentId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    // 1. Verificar que el proyecto existe y está publicado
    let projectData: { exists: boolean; companyId: string | null; status: string | null };
    try {
      projectData = await this.httpClient.get<{
        exists: boolean;
        companyId: string | null;
        status: string | null;
      }>('project', `/internal/projects/${dto.projectId}/exists`);
    } catch (err) {
      this.logger.error(`Error verificando proyecto ${dto.projectId}: ${err.message}`);
      throw new BadRequestException('No se pudo verificar el proyecto');
    }

    if (!projectData.exists) {
      throw new NotFoundException(`El proyecto ${dto.projectId} no existe`);
    }

    if (projectData.status !== 'published') {
      throw new BadRequestException('Solo puedes postularte a proyectos publicados');
    }

    // 2. Evitar postulación duplicada (UNIQUE constraint como backup)
    const existing = await this.applicationRepo.findOne({
      where: { projectId: dto.projectId, studentId },
    });
    if (existing) {
      throw new ConflictException('Ya tienes una postulación activa para este proyecto');
    }

    // 3. Obtener match score del Matching Service (opcional, no falla si no responde)
    let matchScore: number | null = null;
    try {
      const matchResult = await this.httpClient.post<{ overallScore: number }>(
        'matching',
        '/internal/matching/calculate-for-application',
        { projectId: dto.projectId, studentId },
      );
      matchScore = matchResult?.overallScore ?? null;
    } catch (err) {
      this.logger.warn(`Matching Service no disponible: ${err.message}. Continuando sin score.`);
    }

    // 4. Crear postulación
    const application = this.applicationRepo.create({
      projectId: dto.projectId,
      studentId,
      coverLetter: dto.coverLetter,
      resumeUrl: dto.resumeUrl,
      portfolioUrl: dto.portfolioUrl,
      matchScore,
    });

    const saved = await this.applicationRepo.save(application);

    // 5. Crear entrada inicial en timeline
    await this.addTimelineEntry(
      saved.id,
      null,
      ApplicationStatus.PENDING,
      studentId,
      'Postulación enviada',
    );

    // 6. Incrementar contador en Project Service (fire & forget)
    this.httpClient
      .patch<void>('project', `/internal/projects/${dto.projectId}/increment-applications`, {})
      .catch((err) =>
        this.logger.warn(`No se pudo incrementar aplicaciones en Project Service: ${err.message}`),
      );

    // 7. Publicar evento
    await this.eventPublisher.publish('application.created', {
      applicationId: saved.id,
      projectId: saved.projectId,
      studentId: saved.studentId,
      matchScore: saved.matchScore,
      appliedAt: saved.appliedAt,
    }, 'application-service');

    this.logger.log(
      `Postulación creada: ${saved.id} (student=${studentId}, project=${dto.projectId})`,
    );

    return this.findApplicationById(saved.id);
  }

  async getMyApplications(
    studentId: string,
    query: ApplicationQueryDto,
  ): Promise<PaginatedApplicationsResponse> {
    const { page = 1, limit = 20, status } = query;

    const where: FindOptionsWhere<Application> = { studentId };
    if (status) where.status = status;

    const [data, total] = await this.applicationRepo.findAndCount({
      where,
      relations: ['interviews', 'deliverables'],
      order: { appliedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProjectApplications(
    projectId: string,
    companyUserId: string,
    query: ApplicationQueryDto,
  ): Promise<PaginatedApplicationsResponse> {
    const { page = 1, limit = 20, status } = query;

    const where: FindOptionsWhere<Application> = { projectId };
    if (status) where.status = status;

    const [data, total] = await this.applicationRepo.findAndCount({
      where,
      relations: ['interviews', 'deliverables'],
      order: { matchScore: 'DESC', appliedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findApplicationById(id: string): Promise<Application> {
    const app = await this.applicationRepo.findOne({
      where: { id },
      relations: ['timeline', 'interviews', 'deliverables'],
    });
    if (!app) throw new NotFoundException(`Postulación ${id} no encontrada`);
    return app;
  }

  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline[]> {
    await this.findApplicationById(applicationId); // verifica que exista
    return this.timelineRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateStatus(
    applicationId: string,
    companyUserId: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<Application> {
    const application = await this.findApplicationById(applicationId);

    // Validar transición
    const allowed = STATUS_TRANSITIONS[application.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de "${application.status}" a "${dto.status}"`,
      );
    }

    // Requerir razón de rechazo
    if (dto.status === ApplicationStatus.REJECTED && !dto.rejectionReason) {
      throw new BadRequestException('Se requiere una razón de rechazo');
    }

    const previousStatus = application.status;
    application.status = dto.status;

    if (dto.status === ApplicationStatus.REJECTED) {
      application.rejectionReason = dto.rejectionReason ?? null;
    }
    if (dto.status === ApplicationStatus.UNDER_REVIEW || dto.status === ApplicationStatus.SHORTLISTED) {
      application.reviewedAt = new Date();
      application.reviewedBy = companyUserId;
    }
    if (dto.status === ApplicationStatus.ACCEPTED) {
      application.acceptedAt = new Date();
    }
    if (dto.status === ApplicationStatus.COMPLETED) {
      application.completedAt = new Date();
    }

    await this.applicationRepo.save(application);

    // Registrar en timeline
    await this.addTimelineEntry(
      applicationId,
      previousStatus,
      dto.status,
      companyUserId,
      dto.comment,
      dto.status === ApplicationStatus.REJECTED ? { rejectionReason: dto.rejectionReason } : undefined,
    );

    // Publicar evento
    await this.eventPublisher.publish('application.status.changed', {
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      previousStatus,
      newStatus: dto.status,
      changedBy: companyUserId,
    }, 'application-service');

    this.logger.log(
      `Estado actualizado: ${applicationId} ${previousStatus} → ${dto.status} por ${companyUserId}`,
    );

    return this.findApplicationById(applicationId);
  }

  async withdraw(
    applicationId: string,
    studentId: string,
    dto: WithdrawApplicationDto,
  ): Promise<Application> {
    const application = await this.findApplicationById(applicationId);

    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes retirar tus propias postulaciones');
    }

    const terminalStatuses = [
      ApplicationStatus.REJECTED,
      ApplicationStatus.WITHDRAWN,
      ApplicationStatus.COMPLETED,
    ];

    if (terminalStatuses.includes(application.status)) {
      throw new BadRequestException(
        `No se puede retirar una postulación en estado "${application.status}"`,
      );
    }

    const previousStatus = application.status;
    application.status = ApplicationStatus.WITHDRAWN;
    application.withdrawalReason = dto.withdrawalReason;

    await this.applicationRepo.save(application);

    await this.addTimelineEntry(
      applicationId,
      previousStatus,
      ApplicationStatus.WITHDRAWN,
      studentId,
      'Postulación retirada por el estudiante',
      { withdrawalReason: dto.withdrawalReason },
    );

    await this.eventPublisher.publish('application.status.changed', {
      applicationId,
      projectId: application.projectId,
      studentId,
      previousStatus,
      newStatus: ApplicationStatus.WITHDRAWN,
      changedBy: studentId,
    }, 'application-service');

    return this.findApplicationById(applicationId);
  }

  // ──────────────────────────────────────────────────────────────────
  // ENTREVISTAS
  // ──────────────────────────────────────────────────────────────────

  async scheduleInterview(
    applicationId: string,
    companyUserId: string,
    dto: ScheduleInterviewDto,
  ): Promise<Interview> {
    const application = await this.findApplicationById(applicationId);

    if (
      application.status !== ApplicationStatus.SHORTLISTED &&
      application.status !== ApplicationStatus.INTERVIEW
    ) {
      throw new BadRequestException(
        'Solo se pueden programar entrevistas para postulaciones en estado "shortlisted" o "interview"',
      );
    }

    const interview = this.interviewRepo.create({
      applicationId,
      scheduledAt: new Date(dto.scheduledAt),
      interviewType: dto.interviewType,
      durationMinutes: dto.durationMinutes ?? 60,
      location: dto.location,
      meetingLink: dto.meetingLink,
      interviewerId: dto.interviewerId ?? companyUserId,
    });

    const saved = await this.interviewRepo.save(interview);

    // Mover a estado "interview" si aún no está
    if (application.status === ApplicationStatus.SHORTLISTED) {
      await this.updateStatus(applicationId, companyUserId, {
        status: ApplicationStatus.INTERVIEW,
        comment: 'Entrevista programada',
      });
    }

    this.logger.log(`Entrevista programada: ${saved.id} para postulación ${applicationId}`);
    return saved;
  }

  async getInterviews(applicationId: string): Promise<Interview[]> {
    await this.findApplicationById(applicationId);
    return this.interviewRepo.find({
      where: { applicationId },
      order: { scheduledAt: 'ASC' },
    });
  }

  async completeInterview(
    applicationId: string,
    interviewId: string,
    companyUserId: string,
    dto: CompleteInterviewDto,
  ): Promise<Interview> {
    const interview = await this.findInterviewById(interviewId, applicationId);
    interview.status = InterviewStatus.COMPLETED;
    interview.interviewerNotes = dto.interviewerNotes ?? interview.interviewerNotes;
    interview.score = dto.score ?? interview.score;
    return this.interviewRepo.save(interview);
  }

  async cancelInterview(
    applicationId: string,
    interviewId: string,
    companyUserId: string,
    dto: CancelInterviewDto,
  ): Promise<Interview> {
    const interview = await this.findInterviewById(interviewId, applicationId);

    if (interview.status === InterviewStatus.COMPLETED) {
      throw new BadRequestException('No se puede cancelar una entrevista completada');
    }

    interview.status = InterviewStatus.CANCELLED;
    interview.cancelledReason = dto.cancelledReason ?? null;
    return this.interviewRepo.save(interview);
  }

  async rescheduleInterview(
    applicationId: string,
    interviewId: string,
    companyUserId: string,
    dto: RescheduleInterviewDto,
  ): Promise<Interview> {
    const original = await this.findInterviewById(interviewId, applicationId);

    // Marcar original como rescheduled
    original.status = InterviewStatus.RESCHEDULED;
    await this.interviewRepo.save(original);

    // Crear nueva entrevista con referencia al original
    const newInterview = this.interviewRepo.create({
      applicationId,
      scheduledAt: new Date(dto.scheduledAt),
      interviewType: original.interviewType,
      durationMinutes: original.durationMinutes,
      location: original.location,
      meetingLink: original.meetingLink,
      interviewerId: original.interviewerId,
      rescheduledFrom: original.id,
    });

    return this.interviewRepo.save(newInterview);
  }

  // ──────────────────────────────────────────────────────────────────
  // ENTREGABLES DEL ESTUDIANTE
  // ──────────────────────────────────────────────────────────────────

  async submitDeliverable(
    applicationId: string,
    studentId: string,
    dto: SubmitDeliverableDto,
  ): Promise<StudentDeliverable> {
    const application = await this.findApplicationById(applicationId);

    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes enviar entregables en tus propias postulaciones');
    }

    if (application.status !== ApplicationStatus.ACCEPTED) {
      throw new BadRequestException(
        'Solo puedes enviar entregables en postulaciones aceptadas',
      );
    }

    const deliverable = this.deliverableRepo.create({
      applicationId,
      title: dto.title,
      description: dto.description,
      fileUrl: dto.fileUrl,
      projectDeliverableId: dto.projectDeliverableId,
      submittedAt: new Date(),
      status: DeliverableStatus.SUBMITTED,
    });

    return this.deliverableRepo.save(deliverable);
  }

  async updateDeliverable(
    applicationId: string,
    deliverableId: string,
    studentId: string,
    dto: SubmitDeliverableDto,
  ): Promise<StudentDeliverable> {
    const application = await this.findApplicationById(applicationId);
    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes editar tus propios entregables');
    }

    const deliverable = await this.findDeliverableById(deliverableId, applicationId);

    if (deliverable.status === DeliverableStatus.APPROVED) {
      throw new BadRequestException('No se puede editar un entregable ya aprobado');
    }

    deliverable.title = dto.title ?? deliverable.title;
    deliverable.description = dto.description ?? deliverable.description;
    deliverable.fileUrl = dto.fileUrl ?? deliverable.fileUrl;
    const wasNeedsRevision = deliverable.status === DeliverableStatus.NEEDS_REVISION;
    deliverable.submittedAt = new Date();
    deliverable.status = DeliverableStatus.SUBMITTED;

    if (wasNeedsRevision) {
      deliverable.revisionNumber += 1;
    }

    return this.deliverableRepo.save(deliverable);
  }

  async reviewDeliverable(
    applicationId: string,
    deliverableId: string,
    companyUserId: string,
    status: DeliverableStatus.APPROVED | DeliverableStatus.REJECTED | DeliverableStatus.NEEDS_REVISION,
    dto: ReviewDeliverableDto,
  ): Promise<StudentDeliverable> {
    await this.findApplicationById(applicationId);
    const deliverable = await this.findDeliverableById(deliverableId, applicationId);

    if (deliverable.status !== DeliverableStatus.SUBMITTED) {
      throw new BadRequestException('Solo se pueden revisar entregables en estado "submitted"');
    }

    deliverable.status = status;
    deliverable.feedback = dto.feedback ?? null;
    deliverable.grade = dto.grade ?? null;
    deliverable.reviewedBy = companyUserId;
    deliverable.reviewedAt = new Date();

    return this.deliverableRepo.save(deliverable);
  }

  async getDeliverables(applicationId: string): Promise<StudentDeliverable[]> {
    await this.findApplicationById(applicationId);
    return this.deliverableRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // ENDPOINTS INTERNOS
  // ──────────────────────────────────────────────────────────────────

  async countActiveByStudent(studentId: string): Promise<number> {
    return this.applicationRepo.count({
      where: {
        studentId,
        status: ApplicationStatus.PENDING,
      },
    });
  }

  async countByProject(projectId: string): Promise<number> {
    return this.applicationRepo.count({ where: { projectId } });
  }

  /** Llamado por el subscriber de auth.user.deactivated */
  async withdrawAllByStudent(studentId: string): Promise<void> {
    const activeStatuses: ApplicationStatus[] = [
      ApplicationStatus.PENDING,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.INTERVIEW,
    ];

    for (const status of activeStatuses) {
      const apps = await this.applicationRepo.find({
        where: { studentId, status },
      });

      for (const app of apps) {
        app.status = ApplicationStatus.WITHDRAWN;
        app.withdrawalReason = 'Cuenta de usuario desactivada';
        await this.applicationRepo.save(app);

        await this.addTimelineEntry(
          app.id,
          status,
          ApplicationStatus.WITHDRAWN,
          'system',
          'Cuenta de usuario desactivada',
        );
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // HELPERS PRIVADOS
  // ──────────────────────────────────────────────────────────────────

  private async addTimelineEntry(
    applicationId: string,
    fromStatus: ApplicationStatus | null,
    toStatus: ApplicationStatus,
    changedByUserId: string,
    comment?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const entry = this.timelineRepo.create({
      applicationId,
      fromStatus,
      toStatus,
      changedByUserId,
      comment,
      metadata,
    });
    await this.timelineRepo.save(entry);
  }

  private async findInterviewById(
    interviewId: string,
    applicationId: string,
  ): Promise<Interview> {
    const interview = await this.interviewRepo.findOne({
      where: { id: interviewId, applicationId },
    });
    if (!interview) {
      throw new NotFoundException(`Entrevista ${interviewId} no encontrada`);
    }
    return interview;
  }

  private async findDeliverableById(
    deliverableId: string,
    applicationId: string,
  ): Promise<StudentDeliverable> {
    const deliverable = await this.deliverableRepo.findOne({
      where: { id: deliverableId, applicationId },
    });
    if (!deliverable) {
      throw new NotFoundException(`Entregable ${deliverableId} no encontrado`);
    }
    return deliverable;
  }
}

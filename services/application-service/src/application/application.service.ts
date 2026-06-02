import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, MoreThanOrEqual } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Application, ApplicationStatus } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview, InterviewStatus, InterviewType } from './entities/interview.entity';
import { StudentDeliverable, DeliverableStatus } from './entities/student-deliverable.entity';
import { DeliverableAttachment } from './entities/deliverable-attachment.entity';

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
  CreateDeliverableDto,
  BulkCreateDeliverableDto,
} from './dto';

/** Transiciones de estado permitidas para la empresa */
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.PENDING]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.SHORTLISTED]: [
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.INTERVIEW]: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  [ApplicationStatus.ACCEPTED]: [
    ApplicationStatus.PENDING_SUPERVISOR,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.PENDING_SUPERVISOR]: [
    ApplicationStatus.IN_PROGRESS,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.IN_PROGRESS]: [
    ApplicationStatus.COMPLETED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
  [ApplicationStatus.COMPLETED]: [],
  [ApplicationStatus.CANCELLED]: [],
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
    @InjectRepository(DeliverableAttachment)
    private readonly attachmentRepo: Repository<DeliverableAttachment>,
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
    const { page = 1, limit = 20, status, sortBy = 'appliedAt', sortDir = 'DESC' } = query;

    const where: FindOptionsWhere<Application> = { studentId };
    if (status) where.status = status;

    const [data, total] = await this.applicationRepo.findAndCount({
      where,
      relations: ['interviews', 'deliverables'],
      order: { [sortBy]: sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReceivedApplications(
    companyId: string,
    query: ApplicationQueryDto,
  ): Promise<PaginatedApplicationsResponse> {
    const { page = 1, limit = 20, status, minMatchScore, sortBy = 'appliedAt', sortDir = 'DESC' } = query;

    let projectIds: string[] = [];
    try {
      projectIds = await this.httpClient.get<string[]>(
        'project',
        `/internal/projects/company/${companyId}`,
      );
    } catch (err) {
      this.logger.error(`Error obteniendo proyectos de la empresa ${companyId}: ${err.message}`);
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    if (!projectIds || projectIds.length === 0) {
      return { data: [], total: 0, page, limit, totalPages: 0 };
    }

    const where: FindOptionsWhere<Application> = { projectId: In(projectIds) };
    if (status) where.status = status;
    if (minMatchScore !== undefined) {
      where.matchScore = MoreThanOrEqual(minMatchScore);
    }

    const [data, total] = await this.applicationRepo.findAndCount({
      where,
      relations: ['interviews', 'deliverables'],
      order: { [sortBy]: sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC' },
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
    const { page = 1, limit = 20, status, minMatchScore, sortBy, sortDir = 'DESC' } = query;

    const where: FindOptionsWhere<Application> = { projectId };
    if (status) where.status = status;
    if (minMatchScore !== undefined) {
      where.matchScore = MoreThanOrEqual(minMatchScore);
    }

    const order: any = {};
    if (sortBy) {
      order[sortBy] = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    } else {
      order.matchScore = 'DESC';
      order.appliedAt = 'DESC';
    }

    const [data, total] = await this.applicationRepo.findAndCount({
      where,
      relations: ['interviews', 'deliverables'],
      order,
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

  async findEnrichedById(id: string): Promise<{
    id: string;
    projectId: string;
    studentId: string;
    status: ApplicationStatus;
    matchScore: number | null;
    appliedAt: Date;
    acceptedAt: Date | null;
    completedAt: Date | null;
    projectTitle: string;
    companyId: string;
    companyName: string | null;
    studentUserId: string;
    studentFirstName: string | null;
    studentLastName: string | null;
    studentAvatarUrl: string | null;
    companyUserId: string;
    companyNameFromProfile: string | null;
    companyLogoUrl: string | null;
  }> {
    const app = await this.findApplicationById(id);

    const projectInfo = await this.httpClient
      .get<{ id: string; title: string; companyId: string }>(
        'project',
        `/internal/projects/${app.projectId}/exists`,
      )
      .catch(() => null);

    const studentProfile = await this.httpClient
      .get<{ userId: string; firstName: string; lastName: string; avatarUrl: string | null }>(
        'user',
        `/internal/users/profile/${app.studentId}/basic`,
      )
      .catch(() => null);

    let companyUserId = '';
    let companyNameFromProfile: string | null = null;
    let companyLogoUrl: string | null = null;

    if (projectInfo?.companyId) {
      const companyProfile = await this.httpClient
        .get<{ companyId: string; companyName: string; logoUrl: string | null }>(
          'company',
          `/internal/companies/${projectInfo.companyId}/basic-info`,
        )
        .catch(() => null);
      if (companyProfile) {
        companyUserId = companyProfile.companyId;
        companyNameFromProfile = companyProfile.companyName;
        companyLogoUrl = companyProfile.logoUrl;
      }
    }

    const studentUserId = app.studentId;
    const studentFirstName = studentProfile?.firstName ?? null;
    const studentLastName = studentProfile?.lastName ?? null;
    const studentAvatarUrl = studentProfile?.avatarUrl ?? null;

    return {
      id: app.id,
      projectId: app.projectId,
      studentId: app.studentId,
      status: app.status,
      matchScore: app.matchScore,
      appliedAt: app.appliedAt,
      acceptedAt: app.acceptedAt,
      completedAt: app.completedAt,
      projectTitle: projectInfo?.title ?? app.projectId,
      companyId: projectInfo?.companyId ?? '',
      companyName: companyNameFromProfile,
      studentUserId,
      studentFirstName,
      studentLastName,
      studentAvatarUrl,
      companyUserId,
      companyNameFromProfile,
      companyLogoUrl,
    };
  }

  async getApplicationTimeline(applicationId: string): Promise<ApplicationTimeline[]> {
    await this.findApplicationById(applicationId); // verifica que exista
    return this.timelineRepo.find({
      where: { applicationId },
      order: { createdAt: 'ASC' },
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // ADMIN — Asignación de supervisores
  // ──────────────────────────────────────────────────────────────────

  async getAdminPendingApplications(
    query: { page?: number; limit?: number; search?: string },
  ): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> {
    const { page = 1, limit = 10 } = query;

    const [applications, total] = await this.applicationRepo.findAndCount({
      where: { status: ApplicationStatus.ACCEPTED },
      order: { acceptedAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    if (applications.length === 0) {
      return { data: [], total, page, limit, totalPages: 0 };
    }

    // Enrich: student names from user-service
    const studentIds = [...new Set(applications.map((a) => a.studentId))];
    let userProfiles: { userId: string; firstName: string; lastName: string }[] = [];
    try {
      userProfiles = await this.httpClient.post<{ userId: string; firstName: string; lastName: string }[]>(
        'user',
        '/internal/users/batch-basic',
        { userIds: studentIds },
      );
    } catch (err) {
      this.logger.warn(`No se pudo obtener perfiles de estudiantes: ${err.message}`);
    }

    // Enrich: project titles from project-service
    const projectIds = [...new Set(applications.map((a) => a.projectId))];
    let projectInfos: { id: string; title: string; companyId: string }[] = [];
    try {
      projectInfos = await this.httpClient.post<{ id: string; title: string; companyId: string }[]>(
        'project',
        '/internal/projects/batch-basic',
        { projectIds },
      );
    } catch (err) {
      this.logger.warn(`No se pudo obtener info de proyectos: ${err.message}`);
    }

    const userMap = new Map(userProfiles.map((u) => [u.userId, u]));
    const projectMap = new Map(projectInfos.map((p) => [p.id, p]));

    const data = applications.map((app) => {
      const user = userMap.get(app.studentId);
      const project = projectMap.get(app.projectId);
      return {
        id: app.id,
        projectId: app.projectId,
        studentId: app.studentId,
        status: app.status,
        matchScore: app.matchScore,
        appliedAt: app.appliedAt,
        acceptedAt: app.acceptedAt,
        studentName: user ? `${user.firstName} ${user.lastName}` : app.studentId,
        projectTitle: project?.title ?? app.projectId,
        companyId: project?.companyId ?? null,
      };
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async startInProgress(applicationId: string): Promise<void> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException(`Postulación ${applicationId} no encontrada`);

    const previousStatus = application.status;
    application.status = ApplicationStatus.IN_PROGRESS;
    await this.applicationRepo.save(application);

    await this.instantiateProjectDeliverables(applicationId);

    await this.addTimelineEntry(
      applicationId,
      previousStatus,
      ApplicationStatus.IN_PROGRESS,
      'system',
      'Supervisor académico asignado — Proyecto iniciado',
    );

    await this.eventPublisher.publish('application.started', {
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
    }, 'application-service');

    this.logger.log(`Postulación ${applicationId} iniciada (supervisor asignado)`);
  }

  private async instantiateProjectDeliverables(applicationId: string): Promise<void> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) return;

    let templates: any[] = [];
    try {
      templates = await this.httpClient.get<any[]>(
        'project',
        `/internal/projects/${application.projectId}/deliverables`,
      );
    } catch (err) {
      this.logger.warn(`No se pudieron obtener plantillas de entregables para proyecto ${application.projectId}: ${err.message}`);
      return;
    }

    for (const template of templates) {
      const deliverable = this.deliverableRepo.create({
        applicationId,
        title: template.title,
        description: template.description ?? null,
        projectDeliverableId: template.id,
        dueDate: template.dueDate ? new Date(template.dueDate) : null,
        createdByUserId: 'system',
        assignedAt: new Date(),
        status: DeliverableStatus.PENDING,
        type: null,
      });
      await this.deliverableRepo.save(deliverable);
    }

    if (templates.length > 0) {
      this.logger.log(`Instanciadas ${templates.length} plantillas de entregables para aplicación ${applicationId}`);
    }
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
      // Notify student that application is accepted and pending supervisor assignment
      await this.eventPublisher.publish('application.company.accepted', {
        applicationId,
        projectId: application.projectId,
        studentId: application.studentId,
        changedBy: companyUserId,
      }, 'application-service');
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
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW &&
      application.status !== ApplicationStatus.SHORTLISTED &&
      application.status !== ApplicationStatus.INTERVIEW
    ) {
      throw new BadRequestException(
        'Solo se pueden programar entrevistas para postulaciones en estado "pending", "under_review", "shortlisted" o "interview"',
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
    if (
      application.status === ApplicationStatus.PENDING ||
      application.status === ApplicationStatus.UNDER_REVIEW ||
      application.status === ApplicationStatus.SHORTLISTED
    ) {
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
    this.logger.debug(`submitDeliverable called: app=${applicationId}, student=${studentId}, dto=${JSON.stringify(dto)}`);
    const application = await this.findApplicationById(applicationId);

    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes enviar entregables en tus propias postulaciones');
    }

    if (application.status !== ApplicationStatus.ACCEPTED && application.status !== ApplicationStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Solo puedes enviar entregables en postulaciones aceptadas o en progreso (estado actual: ${application.status})`,
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

    const saved = await this.deliverableRepo.save(deliverable);

    await this.eventPublisher.publish('deliverable.submitted', {
      deliverableId: saved.id,
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      title: saved.title,
      submittedAt: saved.submittedAt,
    }, 'application-service');

    return saved;
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
    const application = await this.findApplicationById(applicationId);
    const deliverable = await this.findDeliverableById(deliverableId, applicationId);

    if (deliverable.status !== DeliverableStatus.SUBMITTED) {
      throw new BadRequestException('Solo se pueden revisar entregables en estado "submitted"');
    }

    deliverable.status = status;
    deliverable.feedback = dto.feedback ?? null;
    deliverable.grade = dto.grade ?? null;
    deliverable.reviewedBy = companyUserId;
    deliverable.reviewedAt = new Date();

    const saved = await this.deliverableRepo.save(deliverable);

    await this.eventPublisher.publish('deliverable.reviewed', {
      deliverableId: saved.id,
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      status,
      grade: dto.grade,
      reviewerUserId: companyUserId,
    }, 'application-service');

    return saved;
  }

  async getDeliverables(applicationId: string): Promise<any[]> {
    await this.findApplicationById(applicationId);
    const deliverables = await this.deliverableRepo.find({
      where: { applicationId },
      relations: ['attachments'],
      order: { createdAt: 'ASC' },
    });

    const now = new Date();
    return deliverables.map((d) => ({
      ...d,
      isOverdue: d.status === DeliverableStatus.PENDING && d.dueDate && new Date(d.dueDate) < now,
    }));
  }

  // ──────────────────────────────────────────────────────────────────
  // CREAR ENTREGABLE (EMPRESA)
  // ──────────────────────────────────────────────────────────────────

  async createDeliverable(
    applicationId: string,
    companyUserId: string,
    dto: CreateDeliverableDto,
  ): Promise<StudentDeliverable> {
    const application = await this.findApplicationById(applicationId);

    const validStatuses = [ApplicationStatus.ACCEPTED, ApplicationStatus.IN_PROGRESS];
    if (!validStatuses.includes(application.status)) {
      throw new BadRequestException(
        'Solo se pueden crear entregables en postulaciones aceptadas o en progreso',
      );
    }

    const deliverable = this.deliverableRepo.create({
      applicationId,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type ?? null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      projectDeliverableId: dto.projectDeliverableId ?? null,
      createdByUserId: companyUserId,
      assignedAt: new Date(),
      status: DeliverableStatus.PENDING,
    });

    const saved = await this.deliverableRepo.save(deliverable);

    await this.eventPublisher.publish('deliverable.assigned', {
      deliverableId: saved.id,
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      title: saved.title,
      dueDate: saved.dueDate,
      assignedBy: companyUserId,
    }, 'application-service');

    this.logger.log(`Deliverable ${saved.id} created for application ${applicationId} by ${companyUserId}`);
    return saved;
  }

  async bulkCreateDeliverable(
    companyUserId: string,
    dto: BulkCreateDeliverableDto,
  ): Promise<StudentDeliverable[]> {
    const created: StudentDeliverable[] = [];

    for (const applicationId of dto.applicationIds) {
      const deliverable = this.deliverableRepo.create({
        applicationId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        projectDeliverableId: dto.projectDeliverableId ?? null,
        createdByUserId: companyUserId,
        assignedAt: new Date(),
        status: DeliverableStatus.PENDING,
      });
      created.push(await this.deliverableRepo.save(deliverable));
    }

    this.logger.log(`Bulk created ${created.length} deliverables by ${companyUserId}`);
    return created;
  }

  async addDeliverableAttachment(
    deliverableId: string,
    data: { fileUrl: string; fileName: string; fileSizeBytes?: number; mimeType?: string; uploadedByUserId?: string },
  ): Promise<DeliverableAttachment> {
    const attachment = this.attachmentRepo.create({
      deliverableId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSizeBytes: data.fileSizeBytes ?? null,
      mimeType: data.mimeType ?? null,
      uploadedByUserId: data.uploadedByUserId ?? null,
    });
    return this.attachmentRepo.save(attachment);
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

  /** Retorna todos los projectIds a los que el estudiante ha aplicado (cualquier estado) */
  async getAppliedProjectIds(studentId: string): Promise<string[]> {
    const apps = await this.applicationRepo.find({
      where: { studentId },
      select: ['projectId'],
    });
    return apps.map((a) => a.projectId);
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

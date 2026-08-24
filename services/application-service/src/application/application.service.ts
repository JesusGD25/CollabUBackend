import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, In, MoreThanOrEqual, FindOperator } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Application, ApplicationStatus } from './entities/application.entity';
import { ApplicationTimeline } from './entities/application-timeline.entity';
import { Interview, InterviewStatus, InterviewType } from './entities/interview.entity';
import { StudentDeliverable, DeliverableStatus, RequesterType } from './entities/student-deliverable.entity';
import { DeliverableAttachment } from './entities/deliverable-attachment.entity';
import { ProjectDocument, ProjectDocumentStatus, ProjectDocumentStage } from './entities/project-document.entity';
import { FinalDocumentRequirement, FinalDocActorType } from './entities/final-document-requirement.entity';
import { AcademicSubmission, SubmissionType, SubmissionStatus } from './entities/academic-submission.entity';
import { SubmissionHistory, SubmissionHistoryAction } from './entities/submission-history.entity';
import { ProjectAcademicRecord, AcademicRecordStatus } from './entities/project-academic-record.entity';
import { DeliverableComment } from './entities/deliverable-comment.entity';
import { SelectionDocumentRequest, SelectionDocumentStatus } from './entities/selection-document-request.entity';
import { ProjectDocumentRequirement } from './entities/project-document-requirement.entity';
import { addBusinessDays } from './utils/business-days.util';
import {
  ProjectAccessService,
  ViewerContext,
  Permission,
  PendingAction,
} from './project-access.service';

import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  WithdrawApplicationDto,
  ScheduleInterviewDto,
  CompleteInterviewDto,
  CancelInterviewDto,
  RescheduleInterviewDto,
  StudentInterviewFeedbackDto,
  SelectDocumentRequirementsDto,
  SubmitDeliverableDto,
  ReviewDeliverableDto,
  ApplicationQueryDto,
  CreateDeliverableDto,
  BulkCreateDeliverableDto,
  SetInterviewBriefDto,
  SetInterviewSolutionDto,
  UpdateApplicationNotesDto,
  UploadDocumentDto,
  ReviewDocumentDto,
  ReviewDocumentAction,
  SubmitAnteproyectoDto,
  AsesorCommentDto,
  ReviewAnteproyectoDto,
  JuradoReviewAction,
  CreateDeliverableCommentDto,
  UploadInitiationAgreementDto,
  UploadFinalGradeDto,
  ExtendDeadlineDto,
  StartFinalizationDto,
  UploadFinalDocumentDto,
  RequestSelectionDocumentDto,
  SubmitSelectionDocumentDto,
  ReviewSelectionDocumentDto,
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
    @InjectRepository(ProjectDocument)
    private readonly documentRepo: Repository<ProjectDocument>,
    @InjectRepository(AcademicSubmission)
    private readonly submissionRepo: Repository<AcademicSubmission>,
    @InjectRepository(SubmissionHistory)
    private readonly submissionHistoryRepo: Repository<SubmissionHistory>,
    @InjectRepository(ProjectAcademicRecord)
    private readonly academicRecordRepo: Repository<ProjectAcademicRecord>,
    @InjectRepository(DeliverableComment)
    private readonly deliverableCommentRepo: Repository<DeliverableComment>,
    @InjectRepository(FinalDocumentRequirement)
    private readonly finalDocReqRepo: Repository<FinalDocumentRequirement>,
    @InjectRepository(SelectionDocumentRequest)
    private readonly selectionDocRepo: Repository<SelectionDocumentRequest>,
    @InjectRepository(ProjectDocumentRequirement)
    private readonly projectDocRequirementRepo: Repository<ProjectDocumentRequirement>,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  // ──────────────────────────────────────────────────────────────────
  // CONTROL DE ACCESO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Punto único de autorización sobre una postulación.
   *
   * Todo endpoint que lea o modifique una postulación debe llamar aquí primero.
   * Sin esto, conocer el UUID bastaba para acceder al expediente completo de
   * cualquier estudiante.
   */
  async authorize(
    applicationId: string,
    user: { id: string; role: string },
    permission?: Permission,
  ): Promise<{ application: Application; viewer: ViewerContext }> {
    const application = await this.findApplicationById(applicationId);
    const viewer = permission
      ? await this.projectAccess.assertPermission(application, user, permission)
      : await this.projectAccess.assertAccess(application, user);
    return { application, viewer };
  }

  // ──────────────────────────────────────────────────────────────────
  // POSTULACIONES
  // ──────────────────────────────────────────────────────────────────

  async createApplication(
    studentId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    // 1. Verificar que el proyecto existe y está publicado
    let projectData: {
      exists: boolean;
      companyId: string | null;
      title: string | null;
      status: string | null;
      minimumSemester: number | null;
      academicPrograms: string[] | null;
    };
    try {
      projectData = await this.httpClient.get<{
        exists: boolean;
        companyId: string | null;
        title: string | null;
        status: string | null;
        minimumSemester: number | null;
        academicPrograms: string[] | null;
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

    // Obtener datos del estudiante si se requiere validar semestre o carrera
    const requiresSemesterCheck = projectData.minimumSemester && projectData.minimumSemester > 0;
    const requiresProgramCheck = projectData.academicPrograms && projectData.academicPrograms.length > 0;

    if (requiresSemesterCheck || requiresProgramCheck) {
      let studentSemester: number | null = null;
      let studentProgram: string | null = null;
      try {
        const studentData = await this.httpClient.get<{ semester?: number; program?: string }>(
          'student',
          `/internal/students/${studentId}/matching-data`,
        );
        studentSemester = studentData?.semester ?? null;
        studentProgram = studentData?.program ?? null;
      } catch (err) {
        this.logger.warn(`No se pudo obtener perfil del estudiante ${studentId}: ${err.message}`);
      }

      // Validar semestre mínimo
      if (requiresSemesterCheck && studentSemester !== null && studentSemester < projectData.minimumSemester!) {
        throw new BadRequestException(
          `No cumples con el semestre mínimo requerido (${projectData.minimumSemester}°) para postularte a este proyecto. Tu semestre actual es ${studentSemester}°.`,
        );
      }

      // Validar carrera / programa académico (academicPrograms son IDs del catálogo de admin-service)
      if (requiresProgramCheck && studentProgram) {
        let programNames: string[] = [];
        try {
          programNames = (
            await this.httpClient.get<{ id: string; name: string; code: string }[]>(
              'admin',
              `/internal/admin/programs/by-ids?ids=${projectData.academicPrograms!.join(',')}`,
            )
          ).map((p) => p.name);
        } catch (err) {
          this.logger.warn(`No se pudo resolver programas académicos del proyecto: ${err.message}`);
        }

        const normStudentProgram = studentProgram.toLowerCase().trim();
        const isProgramMatched = programNames.some((prog) => {
          const normReqProgram = prog.toLowerCase().trim();
          return (
            normReqProgram === normStudentProgram ||
            normStudentProgram.includes(normReqProgram) ||
            normReqProgram.includes(normStudentProgram)
          );
        });

        if (!isProgramMatched && programNames.length > 0) {
          throw new BadRequestException(
            `Este proyecto está dirigido únicamente a los programas: ${programNames.join(', ')}. Tu programa registrado es "${studentProgram}".`,
          );
        }
      }
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

    // 7. Publicar evento (enriquecido con datos legibles para Notification Service)
    let studentName: string | null = null;
    try {
      const studentProfile = await this.httpClient.get<{ firstName: string; lastName: string }>(
        'user',
        `/internal/users/profile/${studentId}/basic`,
      );
      studentName = studentProfile ? `${studentProfile.firstName} ${studentProfile.lastName}` : null;
    } catch (err) {
      this.logger.warn(`No se pudo obtener nombre del estudiante ${studentId}: ${err.message}`);
    }

    await this.eventPublisher.publish('application.created', {
      applicationId: saved.id,
      projectId: saved.projectId,
      studentId: saved.studentId,
      matchScore: saved.matchScore,
      appliedAt: saved.appliedAt,
      companyUserId: projectData.companyId,
      studentName,
      projectTitle: projectData.title,
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

    const projectIds = [...new Set(data.map((a) => a.projectId).filter(Boolean))];
    let projectMap = new Map<string, string>();
    if (projectIds.length) {
      try {
        const projects = await this.httpClient.post<any[]>('project', '/internal/projects/batch-basic', { projectIds });
        if (Array.isArray(projects)) {
          projectMap = new Map(projects.map((p: any) => [p.id, p.title]));
        }
      } catch {
        // project titles are non-critical
      }
    }

    return {
      data: data.map((app) => {
        const sanitized = this.sanitizeForStudent(app);
        (sanitized as any).projectTitle = projectMap.get(app.projectId) ?? null;
        return sanitized;
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Oculta información privada de la empresa (notas internas, comentarios de resolución de entrevista) antes de mostrarla al estudiante. */
  private sanitizeForStudent(app: Application): Application {
    const sanitized: Application = { ...app, notes: null };
    if (sanitized.interviews) {
      sanitized.interviews = sanitized.interviews.map((i) => ({
        ...i,
        interviewerNotes: null,
        resolutionComment: null,
      }));
    }
    return sanitized;
  }

  /**
   * Detalle de una postulación para un visor concreto.
   *
   * Comprueba que el usuario participa en el proyecto y sanea el payload según su
   * rol contextual: las notas privadas de la empresa no las ve nadie más.
   */
  async findApplicationForViewer(id: string, user: { id: string; role: string }): Promise<Application> {
    const { application, viewer } = await this.authorize(id, user, 'view_project');
    return this.projectAccess.sanitizeApplication(application, viewer);
  }

  /**
   * Resuelve si un usuario puede descargar un archivo que no le pertenece.
   *
   * Localiza a qué postulación pertenece el archivo recorriendo las tablas que
   * guardan referencias a Storage, resuelve el rol contextual del usuario en esa
   * postulación y comprueba el permiso de lectura correspondiente al tipo de
   * archivo. El jurado de anteproyecto, por ejemplo, puede leer el anteproyecto
   * pero no los entregables de desarrollo.
   */
  async canAccessFile(
    fileId: string,
    user: { id: string; role: string },
  ): Promise<{ allowed: boolean; reason?: string }> {
    const link = await this.locateFile(fileId);
    if (!link) {
      return { allowed: false, reason: 'file_not_owned_by_application_service' };
    }

    let application: Application;
    try {
      application = await this.findApplicationById(link.applicationId);
    } catch {
      return { allowed: false, reason: 'application_not_found' };
    }

    const viewer = await this.projectAccess.resolveViewer(application, user);
    if (viewer) {
      return { allowed: viewer.permissions.includes(link.requiredPermission) };
    }

    // Mismo caso que `getJuradoAnteproyectoHistory` (Bloque 19): un jurado ya
    // desvinculado (autoDisconnectJuradosAnteproyecto) pierde participación
    // ACTIVA y `resolveViewer` lo excluye, pero conserva acceso de solo
    // lectura a los archivos del anteproyecto en el que sí participó.
    if (link.requiredPermission === 'view_anteproyecto') {
      const facultyRole = await this.getFacultyRoleForApplication(link.applicationId, user.id);
      if (facultyRole && (facultyRole.role === 'jurado_anteproyecto' || facultyRole.role === 'asesor')) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'not_a_participant' };
  }

  /** Encuentra la postulación dueña de un archivo y qué permiso exige leerlo. */
  private async locateFile(
    fileId: string,
  ): Promise<{ applicationId: string; requiredPermission: Permission } | null> {
    const submission = await this.submissionRepo.findOne({ where: { currentFileId: fileId } });
    if (submission) {
      return { applicationId: submission.applicationId, requiredPermission: 'view_anteproyecto' };
    }

    const history = await this.submissionHistoryRepo.findOne({ where: { fileId } });
    if (history) {
      const parent = await this.submissionRepo.findOne({ where: { id: history.submissionId } });
      if (parent) {
        return { applicationId: parent.applicationId, requiredPermission: 'view_anteproyecto' };
      }
    }

    const document = await this.documentRepo.findOne({ where: { fileId } });
    if (document) {
      return { applicationId: document.applicationId, requiredPermission: 'view_documents' };
    }

    const selectionDoc = await this.selectionDocRepo.findOne({ where: { fileId } });
    if (selectionDoc) {
      return { applicationId: selectionDoc.applicationId, requiredPermission: 'view_selection_documents' };
    }

    const record =
      (await this.academicRecordRepo.findOne({ where: { initiationAgreementFileId: fileId } })) ??
      (await this.academicRecordRepo.findOne({ where: { finalGradeFileId: fileId } }));
    if (record) {
      return { applicationId: record.applicationId, requiredPermission: 'view_academic_record' };
    }

    const templated = await this.deliverableRepo.findOne({ where: { templateFileId: fileId } });
    if (templated) {
      return { applicationId: templated.applicationId, requiredPermission: 'view_deliverables' };
    }

    // Los entregables guardan una URL de Storage, no el UUID, porque el frontend
    // envía `fileUrl` tras subir. Se localiza por coincidencia dentro de la URL.
    const byUrl = await this.deliverableRepo
      .createQueryBuilder('d')
      .where('d.file_url LIKE :needle', { needle: `%${fileId}%` })
      .getOne();
    if (byUrl) {
      return { applicationId: byUrl.applicationId, requiredPermission: 'view_deliverables' };
    }

    const attachment = await this.attachmentRepo
      .createQueryBuilder('a')
      .where('a.file_url LIKE :needle', { needle: `%${fileId}%` })
      .getOne();
    if (attachment) {
      const parent = await this.deliverableRepo.findOne({ where: { id: attachment.deliverableId } });
      if (parent) {
        return { applicationId: parent.applicationId, requiredPermission: 'view_deliverables' };
      }
    }

    const comment = await this.deliverableCommentRepo.findOne({ where: { attachmentFileId: fileId } });
    if (comment) {
      const parent = await this.deliverableRepo.findOne({ where: { id: comment.deliverableId } });
      if (parent) {
        return { applicationId: parent.applicationId, requiredPermission: 'view_deliverables' };
      }
    }

    const brief =
      (await this.interviewRepo.findOne({ where: { companyBriefFileId: fileId } })) ??
      (await this.interviewRepo.findOne({ where: { studentSolutionFileId: fileId } }));
    if (brief) {
      return { applicationId: brief.applicationId, requiredPermission: 'view_project' };
    }

    return null;
  }

  /**
   * Contrato único del panel del proyecto.
   *
   * Sustituye a las 6-8 peticiones que el frontend encadenaba para pintar una
   * sola pantalla, y expone `viewer.permissions` para que la interfaz deje de
   * deducir permisos con condicionales sobre el rol global — que es lo que
   * producía botones que garantizaban un 403.
   */
  async getProjectContext(applicationId: string, user: { id: string; role: string }) {
    const { application, viewer } = await this.authorize(applicationId, user, 'view_project');

    const [project, record, participants] = await Promise.all([
      this.projectAccess.getProject(application.projectId),
      this.academicRecordRepo.findOne({ where: { applicationId } }),
      this.projectAccess.getParticipants(application),
    ]);

    // Info de empresa para que el estudiante conozca a quién está aplicando —
    // no todas las empresas tienen perfil completo (o ninguno), así que es tolerante a 404.
    let companyProfile: Record<string, any> | null = null;
    if (project?.createdByUserId) {
      try {
        companyProfile = await this.httpClient.get(
          'company',
          `/internal/companies/${project.createdByUserId}/basic-info`,
        );
      } catch (err) {
        this.logger.debug(`Sin perfil de empresa para ${project.createdByUserId}: ${err.message}`);
      }
    }

    const submission = viewer.permissions.includes('view_anteproyecto')
      ? await this.submissionRepo.findOne({
          where: { applicationId, submissionType: SubmissionType.ANTEPROYECTO },
        })
      : null;

    const [documents, deliverables] = await Promise.all([
      viewer.permissions.includes('view_documents')
        ? this.documentRepo.find({ where: { applicationId } })
        : Promise.resolve([]),
      viewer.permissions.includes('view_deliverables')
        ? this.deliverableRepo.find({ where: { applicationId } })
        : Promise.resolve([]),
    ]);

    // Empresa ve todos los entregables del proyecto, incluidos los solicitados
    // por el asesor: transparencia total sobre el trabajo académico del estudiante.
    const visibleDeliverables = deliverables;

    const stage = this.projectAccess.resolveStage(application, record);
    const pendingActions = this.buildPendingActions(viewer, record, submission, documents, visibleDeliverables);

    return {
      application: {
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        reviewedAt: application.reviewedAt,
        acceptedAt: application.acceptedAt,
        completedAt: application.completedAt,
        matchScore: application.matchScore,
        coverLetter: viewer.permissions.includes('view_candidate') || viewer.contextRole === 'student'
          ? application.coverLetter
          : null,
      },
      project: project
        ? {
            id: project.id,
            title: project.title,
            companyId: project.companyId,
            companyUserId: project.createdByUserId,
          }
        : null,
      companyProfile,
      academicRecord: record,
      participants,
      viewer: {
        userId: viewer.userId,
        userRole: viewer.userRole,
        contextRole: viewer.contextRole,
        assignments: viewer.assignments,
        permissions: viewer.permissions,
      },
      stage,
      pendingActions,
      counters: {
        deliverablesPending: visibleDeliverables.filter(
          (d) => d.status === DeliverableStatus.PENDING || d.status === DeliverableStatus.NEEDS_REVISION,
        ).length,
        deliverablesAwaitingReview: visibleDeliverables.filter(
          (d) => d.status === DeliverableStatus.SUBMITTED,
        ).length,
        documentsPending: documents.filter(
          (d) => d.status !== ProjectDocumentStatus.APPROVED,
        ).length,
        documentsAwaitingReview: documents.filter(
          (d) => d.status === ProjectDocumentStatus.SUBMITTED,
        ).length,
      },
    };
  }

  /**
   * "Qué tienes que hacer ahora", calculado por rol contextual.
   *
   * Solo se emiten acciones que el visor puede realmente ejecutar: la lista es
   * la fuente del panel de acciones pendientes del frontend.
   */
  private buildPendingActions(
    viewer: ViewerContext,
    record: ProjectAcademicRecord | null,
    submission: AcademicSubmission | null,
    documents: ProjectDocument[],
    deliverables: StudentDeliverable[],
  ): PendingAction[] {
    const actions: PendingAction[] = [];
    const now = Date.now();
    const can = (p: Permission) => viewer.permissions.includes(p);

    const severityFor = (deadline: Date | null | undefined): 'info' | 'warning' | 'danger' => {
      if (!deadline) return 'info';
      const days = (new Date(deadline).getTime() - now) / 86_400_000;
      if (days < 0) return 'danger';
      if (days <= 3) return 'warning';
      return 'info';
    };

    // ── Anteproyecto ──
    if (submission && can('submit_anteproyecto')) {
      if (submission.status === SubmissionStatus.PENDING_SUBMISSION) {
        actions.push({
          type: 'anteproyecto_submit',
          label: 'Entregar el anteproyecto',
          description: 'Aún no has entregado la primera versión.',
          dueDate: submission.deadlineForStudent?.toISOString() ?? null,
          severity: severityFor(submission.deadlineForStudent),
          targetTab: 'anteproyecto',
        });
      } else if (submission.status === SubmissionStatus.NEEDS_REVISION) {
        actions.push({
          type: 'anteproyecto_revise',
          label: 'Responder a la corrección del jurado',
          description: submission.reviewerComments,
          dueDate: submission.deadlineForStudent?.toISOString() ?? null,
          severity: severityFor(submission.deadlineForStudent),
          targetTab: 'anteproyecto',
        });
      }
    }

    if (
      submission &&
      can('review_anteproyecto') &&
      [SubmissionStatus.SUBMITTED, SubmissionStatus.REVISED, SubmissionStatus.UNDER_REVIEW].includes(
        submission.status,
      )
    ) {
      actions.push({
        type: 'anteproyecto_review',
        label: 'Revisar el anteproyecto',
        description: `Versión ${submission.versionNumber} pendiente de tu revisión.`,
        dueDate: submission.deadlineForReview?.toISOString() ?? null,
        severity: severityFor(submission.deadlineForReview),
        targetTab: 'anteproyecto',
      });
    }

    if (submission?.status === SubmissionStatus.EXPIRED && can('extend_deadline')) {
      actions.push({
        type: 'anteproyecto_expired',
        label: 'Plazo del anteproyecto vencido',
        description: 'El proyecto está bloqueado hasta que se extienda el plazo.',
        dueDate: null,
        severity: 'danger',
        targetTab: 'anteproyecto',
      });
    }

    // ── Documentos ──
    const pendingDocs = documents.filter((d) => d.status === ProjectDocumentStatus.PENDING);
    const rejectedDocs = documents.filter((d) => d.status === ProjectDocumentStatus.REJECTED);
    if (can('upload_document') && (pendingDocs.length > 0 || rejectedDocs.length > 0)) {
      actions.push({
        type: 'documents_upload',
        label:
          rejectedDocs.length > 0
            ? `Corregir ${rejectedDocs.length} documento(s) rechazado(s)`
            : `Cargar ${pendingDocs.length} documento(s) pendiente(s)`,
        description: null,
        dueDate: null,
        severity: rejectedDocs.length > 0 ? 'warning' : 'info',
        targetTab: 'documentos',
      });
    }

    const docsToReview = documents.filter((d) => d.status === ProjectDocumentStatus.SUBMITTED);
    if (can('review_document') && docsToReview.length > 0) {
      actions.push({
        type: 'documents_review',
        label: `Revisar ${docsToReview.length} documento(s)`,
        description: 'El acuerdo de iniciación no puede emitirse hasta aprobarlos.',
        dueDate: null,
        severity: 'warning',
        targetTab: 'documentos',
      });
    }

    // ── Entregables ──
    for (const d of deliverables) {
      const overdue = d.dueDate ? new Date(d.dueDate).getTime() < now : false;
      if (
        can('submit_deliverable') &&
        (d.status === DeliverableStatus.PENDING || d.status === DeliverableStatus.NEEDS_REVISION)
      ) {
        actions.push({
          type: 'deliverable_submit',
          label:
            d.status === DeliverableStatus.NEEDS_REVISION
              ? `Corregir "${d.title}"`
              : `Entregar "${d.title}"`,
          description: d.feedback,
          dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : null,
          severity: overdue ? 'danger' : severityFor(d.dueDate),
          targetTab: 'entregables',
        });
      }
      if (can('review_deliverable') && d.status === DeliverableStatus.SUBMITTED) {
        actions.push({
          type: 'deliverable_review',
          label: `Revisar "${d.title}"`,
          description: null,
          dueDate: null,
          severity: 'warning',
          targetTab: 'entregables',
        });
      }
    }

    // ── Gestión académica ──
    if (record?.status === AcademicRecordStatus.WAITING_AGREEMENT && can('manage_initiation_agreement')) {
      actions.push({
        type: 'agreement_upload',
        label: 'Emitir el acuerdo de iniciación',
        description: 'Todas las precondiciones están cumplidas.',
        dueDate: null,
        severity: 'warning',
        targetTab: 'gestion',
      });
    }

    if (record?.status === AcademicRecordStatus.FINALIZING && can('manage_finalization')) {
      actions.push({
        type: 'final_grade_upload',
        label: 'Cargar la nota final',
        description: null,
        dueDate: null,
        severity: 'warning',
        targetTab: 'gestion',
      });
    }

    const severityRank = { danger: 0, warning: 1, info: 2 };
    return actions.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  }

  async getReceivedApplications(
    companyId: string,
    query: ApplicationQueryDto,
  ): Promise<PaginatedApplicationsResponse> {
    const { page = 1, limit = 20, status, minMatchScore, sortBy = 'appliedAt', sortDir = 'DESC', projectId } = query;

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

    let targetProjectId: string | FindOperator<string> = In(projectIds);
    if (projectId) {
      if (!projectIds.includes(projectId)) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }
      targetProjectId = projectId;
    }

    const where: FindOptionsWhere<Application> = { projectId: targetProjectId };
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

    const uniqueProjectIds = [...new Set(data.map((a) => a.projectId).filter(Boolean))];
    let projectTitleMap = new Map<string, string>();
    if (uniqueProjectIds.length) {
      try {
        const projects = await this.httpClient.post<any[]>('project', '/internal/projects/batch-basic', { projectIds: uniqueProjectIds });
        if (Array.isArray(projects)) {
          projectTitleMap = new Map(projects.map((p: any) => [p.id, p.title]));
        }
      } catch {
        // non-critical
      }
    }

    return {
      data: data.map((app) => {
        (app as any).projectTitle = projectTitleMap.get(app.projectId) ?? null;
        return app;
      }),
      total, page, limit, totalPages: Math.ceil(total / limit),
    };
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

  /**
   * Se invoca desde admin-service justo al crear la asignación de asesor
   * (todavía `pending_acceptance`, no `accepted`). Antes de este método, nada
   * transicionaba `ACCEPTED` → `PENDING_SUPERVISOR`: el estado quedaba
   * inalcanzable y el estudiante seguía apareciendo en la cola de "pendientes
   * de asesor" del admin aunque ya tuviera una asignación en curso.
   */
  async markPendingSupervisor(applicationId: string): Promise<void> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException(`Postulación ${applicationId} no encontrada`);

    if (application.status !== ApplicationStatus.ACCEPTED) {
      this.logger.warn(
        `markPendingSupervisor: postulación ${applicationId} está en "${application.status}", se esperaba "accepted". Se omite.`,
      );
      return;
    }

    const previousStatus = application.status;
    application.status = ApplicationStatus.PENDING_SUPERVISOR;
    await this.applicationRepo.save(application);

    await this.addTimelineEntry(
      applicationId,
      previousStatus,
      ApplicationStatus.PENDING_SUPERVISOR,
      'system',
      'Asesor asignado — esperando aceptación',
    );

    this.logger.log(`Postulación ${applicationId} pasó a pending_supervisor`);
  }

  /**
   * Simétrico a `markPendingSupervisor`: si el docente declina la asignación,
   * la postulación debe volver a `accepted` para reaparecer en la cola del
   * admin y permitir reasignar. Sin esto quedaba huérfana en `pending_supervisor`.
   */
  async revertToAccepted(applicationId: string): Promise<void> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException(`Postulación ${applicationId} no encontrada`);

    if (application.status !== ApplicationStatus.PENDING_SUPERVISOR) {
      this.logger.warn(
        `revertToAccepted: postulación ${applicationId} está en "${application.status}", se esperaba "pending_supervisor". Se omite.`,
      );
      return;
    }

    const previousStatus = application.status;
    application.status = ApplicationStatus.ACCEPTED;
    await this.applicationRepo.save(application);

    await this.addTimelineEntry(
      applicationId,
      previousStatus,
      ApplicationStatus.ACCEPTED,
      'system',
      'Asesor declinó la asignación — pendiente de reasignación',
    );

    this.logger.log(`Postulación ${applicationId} volvió a accepted (asesor declinó)`);
  }

  async startInProgress(applicationId: string, supervisorAssignmentId?: string): Promise<void> {
    const application = await this.applicationRepo.findOne({ where: { id: applicationId } });
    if (!application) throw new NotFoundException(`Postulación ${applicationId} no encontrada`);

    const previousStatus = application.status;
    application.status = ApplicationStatus.IN_PROGRESS;
    await this.applicationRepo.save(application);

    await this.instantiateProjectDeliverables(applicationId);

    if (supervisorAssignmentId) {
      const existingRecord = await this.academicRecordRepo.findOne({ where: { applicationId } });
      if (!existingRecord) {
        await this.academicRecordRepo.save(
          this.academicRecordRepo.create({
            applicationId,
            supervisorAssignmentId,
            status: AcademicRecordStatus.WAITING_ANTEPROYECTO,
          }),
        );
        await this.submissionRepo.save(
          this.submissionRepo.create({
            applicationId,
            submissionType: SubmissionType.ANTEPROYECTO,
            status: SubmissionStatus.PENDING_SUBMISSION,
          }),
        );
      }
    }

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

    // Publicar evento (enriquecido: Chat y Notification Service dependen de estos
    // campos adicionales para crear conversación automática / notificar al estudiante)
    let companyUserIdForEvent: string | null = null;
    let projectTitleForEvent: string | null = null;
    try {
      const projectInfo = await this.httpClient.get<{ companyId: string | null; title: string | null }>(
        'project',
        `/internal/projects/${application.projectId}/exists`,
      );
      companyUserIdForEvent = projectInfo?.companyId ?? null;
      projectTitleForEvent = projectInfo?.title ?? null;
    } catch (err) {
      this.logger.warn(
        `No se pudo enriquecer evento application.status.changed con datos del proyecto ${application.projectId}: ${err.message}`,
      );
    }

    await this.eventPublisher.publish('application.status.changed', {
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      previousStatus,
      newStatus: dto.status,
      changedBy: companyUserId,
      // Alias esperados por Chat Service y Notification Service:
      status: dto.status,
      studentUserId: application.studentId,
      companyUserId: companyUserIdForEvent,
      projectTitle: projectTitleForEvent,
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
      interviewerNotes: dto.notes,
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

  async getInterviews(applicationId: string, isStudentViewer = false): Promise<Interview[]> {
    await this.findApplicationById(applicationId);
    const interviews = await this.interviewRepo.find({
      where: { applicationId },
      order: { scheduledAt: 'ASC' },
    });
    if (!isStudentViewer) return interviews;
    return interviews.map((i) => ({ ...i, interviewerNotes: null, resolutionComment: null }));
  }

  async completeInterview(
    applicationId: string,
    interviewId: string,
    companyUserId: string,
    dto: CompleteInterviewDto,
  ): Promise<Interview> {
    const application = await this.findApplicationById(applicationId);
    const interview = await this.findInterviewById(interviewId, applicationId);
    interview.status = InterviewStatus.COMPLETED;
    interview.interviewerNotes = dto.interviewerNotes ?? interview.interviewerNotes;
    interview.score = dto.score ?? interview.score;
    interview.companyResolution = dto.resolution;
    interview.resolutionComment = dto.resolutionComment ?? null;
    const saved = await this.interviewRepo.save(interview);

    await this.eventPublisher.publish('interview.resolved', {
      interviewId: saved.id,
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      resolution: saved.companyResolution,
    }, 'application-service');

    return saved;
  }

  async setInterviewBrief(
    applicationId: string,
    interviewId: string,
    companyUserId: string,
    dto: SetInterviewBriefDto,
  ): Promise<Interview> {
    const interview = await this.findInterviewById(interviewId, applicationId);
    if (interview.interviewType !== InterviewType.TECHNICAL) {
      throw new BadRequestException('Solo las entrevistas de tipo "technical" admiten enunciado de prueba técnica');
    }
    if (dto.fileId !== undefined) interview.companyBriefFileId = dto.fileId;
    if (dto.description !== undefined) interview.technicalTaskDescription = dto.description;
    if (dto.dueDate !== undefined) interview.technicalTaskDueDate = new Date(dto.dueDate);
    return this.interviewRepo.save(interview);
  }

  async setInterviewSolution(
    applicationId: string,
    interviewId: string,
    studentId: string,
    dto: SetInterviewSolutionDto,
  ): Promise<Interview> {
    const application = await this.findApplicationById(applicationId);
    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes subir tu propia solución');
    }
    const interview = await this.findInterviewById(interviewId, applicationId);
    if (interview.interviewType !== InterviewType.TECHNICAL) {
      throw new BadRequestException('Solo las entrevistas de tipo "technical" admiten solución del estudiante');
    }
    interview.studentSolutionFileId = dto.fileId;
    return this.interviewRepo.save(interview);
  }

  async updateNotes(
    applicationId: string,
    companyUserId: string,
    dto: UpdateApplicationNotesDto,
  ): Promise<Application> {
    const application = await this.findApplicationById(applicationId);
    application.notes = dto.notes;
    return this.applicationRepo.save(application);
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

  /**
   * El estudiante deja su comentario sobre la entrevista. Columna
   * `studentFeedback` existía en la entidad desde antes de esta sesión pero
   * no tenía DTO/endpoint/consumidor — quedaba huérfana, igual que otros
   * casos ya encontrados en la auditoría de este flujo.
   */
  async setStudentInterviewFeedback(
    applicationId: string,
    interviewId: string,
    studentId: string,
    dto: StudentInterviewFeedbackDto,
  ): Promise<Interview> {
    const application = await this.findApplicationById(applicationId);
    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes comentar en entrevistas de tu propia postulación');
    }

    const interview = await this.findInterviewById(interviewId, applicationId);
    interview.studentFeedback = dto.studentFeedback;
    return this.interviewRepo.save(interview);
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
      fileUrl: dto.fileId || dto.fileUrl,
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
    deliverable.fileUrl = dto.fileId ?? dto.fileUrl ?? deliverable.fileUrl;
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
    reviewerUserId: string,
    status: DeliverableStatus.APPROVED | DeliverableStatus.REJECTED | DeliverableStatus.NEEDS_REVISION,
    dto: ReviewDeliverableDto,
    reviewerRole?: string,
  ): Promise<StudentDeliverable> {
    const application = await this.findApplicationById(applicationId);
    const deliverable = await this.findDeliverableById(deliverableId, applicationId);

    if (deliverable.status !== DeliverableStatus.SUBMITTED) {
      throw new BadRequestException('Solo se pueden revisar entregables en estado "submitted"');
    }

    if (status === DeliverableStatus.REJECTED && (!dto.feedback || !dto.feedback.trim())) {
      throw new BadRequestException('El comentario de retroalimentación es obligatorio al rechazar un entregable');
    }

    deliverable.status = status;
    deliverable.feedback = dto.feedback?.trim() ?? null;
    deliverable.grade = dto.grade ?? null;
    deliverable.reviewedBy = reviewerUserId;
    deliverable.reviewedByRole = reviewerRole ?? null;
    deliverable.reviewedAt = new Date();

    const saved = await this.deliverableRepo.save(deliverable);

    await this.eventPublisher.publish('deliverable.reviewed', {
      deliverableId: saved.id,
      applicationId,
      projectId: application.projectId,
      studentId: application.studentId,
      status,
      grade: dto.grade,
      reviewerUserId,
      reviewerRole,
    }, 'application-service');

    return saved;
  }

  /**
   * Todos los participantes ven todos los entregables del proyecto, sin importar
   * quién los solicitó (empresa o asesor). Los comentarios internos siguen siendo
   * privados por su flag `is_internal`.
   */
  async getDeliverables(applicationId: string, _viewerRole?: string): Promise<any[]> {
    const application = await this.findApplicationById(applicationId);
    const deliverables = await this.deliverableRepo.find({
      where: { applicationId },
      relations: ['attachments'],
      order: { createdAt: 'ASC' },
    });

    const participants = await this.projectAccess.getParticipants(application).catch(() => []);
    const userMap = new Map(participants.map((p) => [p.userId, p]));

    const now = new Date();
    return deliverables.map((d) => {
      const reviewer = d.reviewedBy ? userMap.get(d.reviewedBy) : null;
      return {
        ...d,
        reviewerName: reviewer?.fullName ?? null,
        reviewerRole: d.reviewedByRole ?? reviewer?.role ?? null,
        isOverdue: d.status === DeliverableStatus.PENDING && d.dueDate && new Date(d.dueDate) < now,
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // CREAR ENTREGABLE (EMPRESA)
  // ──────────────────────────────────────────────────────────────────

  async createDeliverable(
    applicationId: string,
    companyUserId: string,
    dto: CreateDeliverableDto,
    requesterType: RequesterType = RequesterType.COMPANY,
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
      templateFileId: dto.templateFileId ?? null,
      requesterType,
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
    requesterType: RequesterType = RequesterType.COMPANY,
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
        requesterType,
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

  // ──────────────────────────────────────────────────────────────────
  // DOCUMENTOS REQUERIDOS
  // ──────────────────────────────────────────────────────────────────

  async uploadDocument(
    applicationId: string,
    uploaderId: string,
    uploaderContextRole: string,
    dto: UploadDocumentDto,
  ): Promise<ProjectDocument> {
    const application = await this.findApplicationById(applicationId);

    // El admin debe haber seleccionado este documento del catálogo para ESTE
    // proyecto — ya no basta con que exista en el catálogo global (antes
    // cualquier requirement con requiredAtStage=pre_initiation aplicaba a
    // todos los proyectos por igual, sin selección real).
    const link = await this.projectDocRequirementRepo.findOne({
      where: { applicationId, documentRequirementId: dto.requirementId },
    });
    if (!link) {
      throw new BadRequestException('Este documento no fue solicitado para este proyecto');
    }

    let requirement: { id: string; name: string; actorType: string } | null = null;
    try {
      requirement = await this.httpClient.get<{ id: string; name: string; actorType: string }>(
        'admin',
        `/internal/admin/document-requirements/${dto.requirementId}`,
      );
    } catch {
      // fallback: buscar en la lista si el endpoint por ID no existe
    }
    if (!requirement) {
      try {
        const all = await this.httpClient.get<{ id: string; name: string; actorType: string }[]>('admin', '/internal/admin/document-requirements');
        requirement = all.find((r) => r.id === dto.requirementId) ?? null;
      } catch (err) {
        this.logger.warn(`No se pudo verificar el documento requerido ${dto.requirementId}: ${err.message}`);
      }
    }
    if (!requirement) throw new NotFoundException('Documento requerido no encontrado');

    // El actor asignado debe coincidir con quien sube (el admin puede suplir a
    // cualquiera) — mismo criterio que `uploadFinalDocument`. Sin esto, un
    // estudiante con permiso genérico `upload_document` podía cargar los
    // documentos que le correspondían a la empresa, y viceversa.
    if (uploaderContextRole !== 'admin' && uploaderContextRole !== requirement.actorType) {
      throw new ForbiddenException(
        `Este documento debe subirlo ${this.actorLabel(requirement.actorType)}, no ${uploaderContextRole}`,
      );
    }

    let document = await this.documentRepo.findOne({
      where: { applicationId, requirementId: dto.requirementId },
    });

    if (!document) {
      document = this.documentRepo.create({
        applicationId,
        requirementId: dto.requirementId,
        requirementName: requirement.name,
      });
    }

    document.submittedBy = uploaderId;
    document.fileId = dto.fileId;
    document.status = ProjectDocumentStatus.SUBMITTED;
    document.submittedAt = new Date();
    document.reviewerComment = null;

    const saved = await this.documentRepo.save(document);

    await this.eventPublisher.publish(
      'academic.document.submitted',
      {
        documentId: saved.id,
        applicationId,
        requirementName: saved.requirementName,
        studentId: application.studentId,
        submittedBy: uploaderId,
      },
      'application-service',
    );

    return saved;
  }

  async getDocuments(applicationId: string): Promise<ProjectDocument[]> {
    return this.documentRepo.find({ where: { applicationId }, order: { createdAt: 'ASC' } });
  }

  /**
   * El admin elige, por proyecto, cuáles `DocumentRequirement` del catálogo
   * global aplican aquí. Es aditivo — llamar de nuevo con IDs ya vinculados
   * simplemente los ignora (no falla ni duplica).
   */
  async selectDocumentRequirements(
    applicationId: string,
    adminId: string,
    dto: SelectDocumentRequirementsDto,
  ): Promise<ProjectDocumentRequirement[]> {
    await this.findApplicationById(applicationId);

    const existing = await this.projectDocRequirementRepo.find({ where: { applicationId } });
    const existingIds = new Set(existing.map((l) => l.documentRequirementId));
    const newIds = dto.requirementIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) return existing;

    const created = await this.projectDocRequirementRepo.save(
      newIds.map((documentRequirementId) =>
        this.projectDocRequirementRepo.create({ applicationId, documentRequirementId, addedBy: adminId }),
      ),
    );

    return [...existing, ...created];
  }

  /**
   * Documentos requeridos vinculados a este proyecto, enriquecidos con los
   * datos del catálogo (nombre, descripción, actor, obligatoriedad, plantilla).
   * Fuente única para `DocumentsPanelComponent` y `getInitiationChecklist` —
   * ninguno de los dos vuelve a consultar el catálogo global sin filtrar por
   * proyecto.
   */
  async getProjectDocumentRequirements(applicationId: string): Promise<Array<{
    id: string; name: string; description: string | null; actorType: string;
    isMandatory: boolean; templateFileId: string | null;
  }>> {
    const links = await this.projectDocRequirementRepo.find({ where: { applicationId } });
    if (links.length === 0) return [];

    try {
      const catalog = await this.httpClient.get<Array<{
        id: string; name: string; description: string | null; actorType: string;
        isMandatory: boolean; templateFileId: string | null;
      }>>('admin', '/internal/admin/document-requirements');
      const catalogMap = new Map(catalog.map((c) => [c.id, c]));
      return links
        .map((l) => catalogMap.get(l.documentRequirementId))
        .filter((c): c is NonNullable<typeof c> => !!c);
    } catch (err) {
      this.logger.warn(`No se pudo obtener el catálogo de documentos: ${err.message}`);
      return [];
    }
  }

  async reviewDocument(
    applicationId: string,
    documentId: string,
    reviewerId: string,
    reviewerRole: string,
    dto: ReviewDocumentDto,
  ): Promise<ProjectDocument> {
    const document = await this.documentRepo.findOne({ where: { id: documentId, applicationId } });
    if (!document) throw new NotFoundException('Documento no encontrado');

    if (reviewerRole === 'faculty') {
      const facultyRole = await this.getFacultyRoleForApplication(applicationId, reviewerId);
      if (!facultyRole || facultyRole.role !== 'jurado_final') {
        throw new ForbiddenException('Solo el jurado final puede revisar documentos (o el admin)');
      }
    }

    document.status = dto.status === ReviewDocumentAction.APPROVE ? ProjectDocumentStatus.APPROVED : ProjectDocumentStatus.REJECTED;
    document.reviewerId = reviewerId;
    document.reviewerComment = dto.comment ?? null;
    document.reviewedAt = new Date();

    return this.documentRepo.save(document);
  }

  // ──────────────────────────────────────────────────────────────────
  // DOCUMENTOS DE SELECCIÓN — solicitados por la empresa antes del inicio
  // (prueba técnica, certificado, referencia...). Siempre empresa→estudiante,
  // no requieren `ProjectAcademicRecord` — existen desde que hay postulación.
  // ──────────────────────────────────────────────────────────────────

  async requestSelectionDocument(
    applicationId: string,
    companyUserId: string,
    dto: RequestSelectionDocumentDto,
  ): Promise<SelectionDocumentRequest> {
    await this.findApplicationById(applicationId);

    const doc = this.selectionDocRepo.create({
      applicationId,
      name: dto.name,
      description: dto.description ?? null,
      isMandatory: dto.isMandatory ?? true,
      requestedBy: companyUserId,
      status: SelectionDocumentStatus.REQUESTED,
    });
    const saved = await this.selectionDocRepo.save(doc);

    const application = await this.findApplicationById(applicationId);
    await this.eventPublisher.publish(
      'application.selection_document.requested',
      {
        documentId: saved.id,
        applicationId,
        name: saved.name,
        studentId: application.studentId,
        requestedBy: companyUserId,
      },
      'application-service',
    );

    return saved;
  }

  async getSelectionDocuments(applicationId: string): Promise<SelectionDocumentRequest[]> {
    return this.selectionDocRepo.find({ where: { applicationId }, order: { createdAt: 'ASC' } });
  }

  async submitSelectionDocument(
    applicationId: string,
    documentId: string,
    studentId: string,
    dto: SubmitSelectionDocumentDto,
  ): Promise<SelectionDocumentRequest> {
    const doc = await this.selectionDocRepo.findOne({ where: { id: documentId, applicationId } });
    if (!doc) throw new NotFoundException('Documento solicitado no encontrado');

    doc.fileId = dto.fileId;
    doc.status = SelectionDocumentStatus.SUBMITTED;
    doc.submittedAt = new Date();
    doc.reviewerComment = null;
    const saved = await this.selectionDocRepo.save(doc);

    await this.eventPublisher.publish(
      'application.selection_document.submitted',
      { documentId: saved.id, applicationId, name: saved.name, submittedBy: studentId },
      'application-service',
    );

    return saved;
  }

  async reviewSelectionDocument(
    applicationId: string,
    documentId: string,
    reviewerId: string,
    dto: ReviewSelectionDocumentDto,
  ): Promise<SelectionDocumentRequest> {
    const doc = await this.selectionDocRepo.findOne({ where: { id: documentId, applicationId } });
    if (!doc) throw new NotFoundException('Documento solicitado no encontrado');
    if (doc.status !== SelectionDocumentStatus.SUBMITTED) {
      throw new BadRequestException('Solo se puede revisar un documento ya entregado');
    }

    doc.status = dto.status === 'approve' ? SelectionDocumentStatus.APPROVED : SelectionDocumentStatus.REJECTED;
    doc.reviewerId = reviewerId;
    doc.reviewerComment = dto.comment ?? null;
    doc.reviewedAt = new Date();

    return this.selectionDocRepo.save(doc);
  }

  // ──────────────────────────────────────────────────────────────────
  // ANTEPROYECTO — asesor/jurado con control de plazos
  // ──────────────────────────────────────────────────────────────────

  private async getFacultyRoleForApplication(
    applicationId: string,
    facultyUserId: string,
  ): Promise<{ role: string; assignmentId: string; status: string } | null> {
    try {
      const assignments = await this.httpClient.get<
        { id: string; supervisorId: string; supervisorUserId: string; role: string; status: string }[]
      >('admin', `/internal/admin/assignments/by-application/${applicationId}`);
      const mine = assignments.find((a) => a.supervisorUserId === facultyUserId);
      return mine ? { role: mine.role, assignmentId: mine.id, status: mine.status } : null;
    } catch (err) {
      this.logger.warn(`No se pudo resolver el rol académico de ${facultyUserId} en ${applicationId}: ${err.message}`);
      return null;
    }
  }

  private async getBusinessDaysSetting(key: string, fallback: number): Promise<number> {
    try {
      const setting = await this.httpClient.get<{ value: number } | null>('admin', `/internal/admin/settings/${key}`);
      return typeof setting?.value === 'number' ? setting.value : fallback;
    } catch {
      return fallback;
    }
  }

  private async getHolidays(): Promise<string[]> {
    try {
      const setting = await this.httpClient.get<{ value: string[] } | null>('admin', '/internal/admin/settings/holidays_colombia');
      return Array.isArray(setting?.value) ? setting.value : [];
    } catch {
      return [];
    }
  }

  /** Resuelve companyUserId y asesorUserId de una aplicación para enriquecer eventos de notificación. */
  private async getNotificationContext(
    applicationId: string,
    projectId: string,
  ): Promise<{
    companyUserId: string | null; asesorUserId: string | null; juradoUserIds: string[]; projectTitle: string | null;
  }> {
    let companyUserId: string | null = null;
    let projectTitle: string | null = null;
    try {
      const projects = await this.httpClient.post<{ createdByUserId: string; title: string }[]>(
        'project',
        '/internal/projects/batch-basic',
        { projectIds: [projectId] },
      );
      companyUserId = projects[0]?.createdByUserId ?? null;
      projectTitle = projects[0]?.title ?? null;
    } catch (err) {
      this.logger.warn(`No se pudo resolver companyUserId del proyecto ${projectId}: ${err.message}`);
    }

    let asesorUserId: string | null = null;
    let juradoUserIds: string[] = [];
    try {
      const assignments = await this.httpClient.get<{ supervisorUserId: string; role: string }[]>(
        'admin',
        `/internal/admin/assignments/by-application/${applicationId}`,
      );
      asesorUserId = assignments.find((a) => a.role === 'asesor')?.supervisorUserId ?? null;
      juradoUserIds = assignments.filter((a) => a.role === 'jurado_anteproyecto').map((a) => a.supervisorUserId);
    } catch (err) {
      this.logger.warn(`No se pudo resolver asesor/jurado de ${applicationId}: ${err.message}`);
    }

    return { companyUserId, asesorUserId, juradoUserIds, projectTitle };
  }

  private async getAnteproyectoSubmission(applicationId: string): Promise<AcademicSubmission> {
    const submission = await this.submissionRepo.findOne({
      where: { applicationId, submissionType: SubmissionType.ANTEPROYECTO },
    });
    if (!submission) throw new NotFoundException('No existe un proceso de anteproyecto para esta postulación');
    return submission;
  }

  async getAnteproyectoHistory(applicationId: string): Promise<SubmissionHistory[]> {
    const submission = await this.getAnteproyectoSubmission(applicationId);
    return this.submissionHistoryRepo.find({ where: { submissionId: submission.id }, order: { createdAt: 'ASC' } });
  }

  /**
   * Vista de solo lectura del anteproyecto para un jurado que YA no tiene
   * acceso activo al proyecto (se desvincula automáticamente al aprobarse —
   * `autoDisconnectJuradosAnteproyecto`). Autoriza por "alguna vez fue jurado
   * de esta aplicación" (`getFacultyRoleForApplication` no filtra por status),
   * a diferencia de `authorize()`/`assertAccess`, que exige participación
   * ACTIVA y por eso 403 aquí. Separa "ya no tengo acciones pendientes" de
   * "nunca participé": el primero conserva acceso de solo lectura a su
   * propio historial, el segundo sigue sin acceso alguno.
   */
  async getJuradoAnteproyectoHistory(
    applicationId: string,
    facultyUserId: string,
  ): Promise<{ submission: AcademicSubmission; history: SubmissionHistory[] }> {
    const facultyRole = await this.getFacultyRoleForApplication(applicationId, facultyUserId);
    if (!facultyRole || facultyRole.role !== 'jurado_anteproyecto') {
      throw new ForbiddenException('No participaste como jurado de anteproyecto en esta postulación');
    }

    const submission = await this.getAnteproyectoSubmission(applicationId);
    const history = await this.submissionHistoryRepo.find({
      where: { submissionId: submission.id },
      order: { createdAt: 'ASC' },
    });
    return { submission, history };
  }

  /** Estudiante entrega o re-entrega el anteproyecto (nueva versión). */
  async submitAnteproyecto(applicationId: string, studentId: string, dto: SubmitAnteproyectoDto): Promise<AcademicSubmission> {
    const application = await this.findApplicationById(applicationId);
    if (application.studentId !== studentId) {
      throw new ForbiddenException('Solo puedes entregar el anteproyecto de tu propia postulación');
    }

    const submission = await this.getAnteproyectoSubmission(applicationId);

    const validStates = [
      SubmissionStatus.PENDING_SUBMISSION,
      SubmissionStatus.NEEDS_REVISION,
    ];
    if (!validStates.includes(submission.status)) {
      throw new BadRequestException(`No se puede entregar el anteproyecto en estado "${submission.status}"`);
    }

    const isFirstSubmission = submission.versionNumber === 0;
    submission.currentFileId = dto.fileId;
    submission.versionNumber += 1;
    submission.status = isFirstSubmission ? SubmissionStatus.SUBMITTED : SubmissionStatus.REVISED;
    submission.submittedAt = new Date();
    submission.studentResponse = null;

    const jurdoReviewDays = await this.getBusinessDaysSetting('anteproyecto.jurado_review_business_days', 8);
    const holidays = await this.getHolidays();
    submission.deadlineForReview = addBusinessDays(new Date(), jurdoReviewDays, holidays);
    submission.deadlineForStudent = null;
    submission.juradoVotes = null;

    const saved = await this.submissionRepo.save(submission);

    await this.submissionHistoryRepo.save(
      this.submissionHistoryRepo.create({
        submissionId: saved.id,
        action: isFirstSubmission ? SubmissionHistoryAction.SUBMITTED : SubmissionHistoryAction.REVISED,
        actorId: studentId,
        actorRole: 'student',
        fileId: dto.fileId,
        versionNumber: saved.versionNumber,
      }),
    );

    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);
    await this.eventPublisher.publish(
      isFirstSubmission ? 'academic.anteproyecto.submitted' : 'academic.anteproyecto.revised',
      {
        applicationId,
        submissionId: saved.id,
        studentId: application.studentId,
        versionNumber: saved.versionNumber,
        asesorUserId: notifCtx.asesorUserId,
        juradoUserIds: notifCtx.juradoUserIds,
        projectTitle: notifCtx.projectTitle,
      },
      'application-service',
    );

    return saved;
  }

  /** El asesor comenta en el anteproyecto — no aprueba ni rechaza. */
  async addAsesorComment(applicationId: string, facultyUserId: string, dto: AsesorCommentDto): Promise<AcademicSubmission> {
    const facultyRole = await this.getFacultyRoleForApplication(applicationId, facultyUserId);
    if (!facultyRole || facultyRole.role !== 'asesor') {
      throw new ForbiddenException('Solo el asesor asignado puede comentar en el anteproyecto');
    }

    const submission = await this.getAnteproyectoSubmission(applicationId);
    submission.asesorComments = dto.comment;
    const saved = await this.submissionRepo.save(submission);

    await this.submissionHistoryRepo.save(
      this.submissionHistoryRepo.create({
        submissionId: saved.id,
        action: SubmissionHistoryAction.ASESOR_COMMENTED,
        actorId: facultyUserId,
        actorRole: 'asesor',
        comment: dto.comment,
      }),
    );

    return saved;
  }

  /** Jurados activos (accepted) de anteproyecto para una aplicación. */
  private async getActiveJuradoUserIds(applicationId: string): Promise<string[]> {
    try {
      const assignments = await this.httpClient.get<{ supervisorUserId: string; role: string; status: string }[]>(
        'admin',
        `/internal/admin/assignments/by-application/${applicationId}`,
      );
      return assignments
        .filter((a) => a.role === 'jurado_anteproyecto' && a.status === 'accepted')
        .map((a) => a.supervisorUserId);
    } catch (err: any) {
      this.logger.warn(`No se pudo resolver jurados activos de ${applicationId}: ${err.message}`);
      return [];
    }
  }

  /**
   * El jurado revisa: solicita corrección, aprueba, o rechaza (solo tras 2 correcciones).
   * Con múltiples jurados, aprobar/rechazar requiere que TODOS los jurados activos
   * emitan su voto para la versión actual (unanimidad para aprobar; un solo voto
   * de rechazo, una vez que todos votaron, rechaza el anteproyecto). Solicitar
   * corrección no requiere consenso — cualquier jurado puede pedirla de inmediato.
   */
  async reviewAnteproyecto(applicationId: string, facultyUserId: string, dto: ReviewAnteproyectoDto): Promise<AcademicSubmission> {
    const facultyRole = await this.getFacultyRoleForApplication(applicationId, facultyUserId);
    if (!facultyRole || facultyRole.role !== 'jurado_anteproyecto') {
      throw new ForbiddenException('Solo el jurado de anteproyecto puede revisar');
    }

    const submission = await this.getAnteproyectoSubmission(applicationId);
    const reviewableStates = [SubmissionStatus.SUBMITTED, SubmissionStatus.REVISED, SubmissionStatus.UNDER_REVIEW];
    if (!reviewableStates.includes(submission.status)) {
      throw new BadRequestException(`No se puede revisar el anteproyecto en estado "${submission.status}"`);
    }

    const maxCorrections = await this.getBusinessDaysSetting('anteproyecto.max_corrections', 2);

    if (dto.action === JuradoReviewAction.REJECT && submission.correctionCount < maxCorrections) {
      throw new BadRequestException(
        `El jurado debe solicitar al menos ${maxCorrections} corrección(es) antes de poder rechazar`,
      );
    }
    if ((dto.action === JuradoReviewAction.CORRECTION || dto.action === JuradoReviewAction.REJECT) && !dto.comment) {
      throw new BadRequestException('Se requiere un comentario para solicitar corrección o rechazar');
    }
    if (dto.action === JuradoReviewAction.CORRECTION && submission.correctionCount >= maxCorrections) {
      throw new BadRequestException(
        `Ya se alcanzó el máximo de ${maxCorrections} ciclos de corrección — el jurado debe aprobar o rechazar`,
      );
    }

    const application = await this.findApplicationById(applicationId);
    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);

    // Corrección: no requiere consenso, resuelve de inmediato y reinicia los votos.
    if (dto.action === JuradoReviewAction.CORRECTION) {
      submission.status = SubmissionStatus.NEEDS_REVISION;
      submission.correctionCount += 1;
      submission.reviewerComments = dto.comment ?? null;
      submission.reviewedAt = new Date();
      submission.juradoVotes = null;
      const studentDays = await this.getBusinessDaysSetting('anteproyecto.student_revision_business_days', 5);
      const holidays = await this.getHolidays();
      submission.deadlineForStudent = addBusinessDays(new Date(), studentDays, holidays);
      submission.deadlineForReview = null;

      const saved = await this.submissionRepo.save(submission);
      await this.submissionHistoryRepo.save(
        this.submissionHistoryRepo.create({
          submissionId: saved.id,
          action: SubmissionHistoryAction.CORRECTION_REQUESTED,
          actorId: facultyUserId,
          actorRole: 'jurado_anteproyecto',
          comment: dto.comment ?? null,
          fileId: dto.fileId ?? null,
          versionNumber: saved.versionNumber,
        }),
      );

      await this.eventPublisher.publish(
        'academic.anteproyecto.correction_requested',
        {
          applicationId, submissionId: saved.id, comment: dto.comment,
          studentId: application.studentId, asesorUserId: notifCtx.asesorUserId, projectTitle: notifCtx.projectTitle,
        },
        'application-service',
      );

      return saved;
    }

    // Aprobar / rechazar: registrar el voto de este jurado y verificar unanimidad.
    const activeJuradoUserIds = await this.getActiveJuradoUserIds(applicationId);
    const votes: Record<string, 'approve' | 'reject'> = { ...(submission.juradoVotes ?? {}) };
    votes[facultyUserId] = dto.action === JuradoReviewAction.APPROVE ? 'approve' : 'reject';

    await this.submissionHistoryRepo.save(
      this.submissionHistoryRepo.create({
        submissionId: submission.id,
        action: dto.action === JuradoReviewAction.APPROVE ? SubmissionHistoryAction.APPROVED : SubmissionHistoryAction.REJECTED,
        actorId: facultyUserId,
        actorRole: 'jurado_anteproyecto',
        comment: dto.comment ?? (dto.action === JuradoReviewAction.APPROVE ? `Voto: aprobar (${Object.keys(votes).length}/${activeJuradoUserIds.length || 1})` : null),
        fileId: dto.fileId ?? null,
        versionNumber: submission.versionNumber,
      }),
    );

    const allVoted = activeJuradoUserIds.length > 0 && activeJuradoUserIds.every((id) => votes[id] !== undefined);

    if (!allVoted) {
      // Falta que otros jurados voten — queda en revisión sin resolver aún.
      submission.status = SubmissionStatus.UNDER_REVIEW;
      submission.juradoVotes = votes;
      submission.reviewerComments = dto.comment ?? submission.reviewerComments;
      return this.submissionRepo.save(submission);
    }

    const anyRejected = activeJuradoUserIds.some((id) => votes[id] === 'reject');
    submission.juradoVotes = votes;
    submission.reviewedAt = new Date();
    submission.reviewerComments = dto.comment ?? submission.reviewerComments;
    submission.deadlineForReview = null;
    submission.deadlineForStudent = null;

    if (anyRejected) {
      submission.status = SubmissionStatus.REJECTED;
      const saved = await this.submissionRepo.save(submission);
      await this.eventPublisher.publish(
        'academic.anteproyecto.rejected',
        {
          applicationId, submissionId: saved.id, comment: dto.comment,
          studentId: application.studentId, asesorUserId: notifCtx.asesorUserId, projectTitle: notifCtx.projectTitle,
        },
        'application-service',
      );
      return saved;
    }

    submission.status = SubmissionStatus.APPROVED;
    const saved = await this.submissionRepo.save(submission);

    const record = await this.academicRecordRepo.findOne({ where: { applicationId } });
    if (record) {
      record.anteproyectoSubmissionId = saved.id;
      record.status = AcademicRecordStatus.WAITING_DOCUMENTS;
      await this.academicRecordRepo.save(record);
    }

    await this.eventPublisher.publish(
      'academic.anteproyecto.approved',
      {
        applicationId, submissionId: saved.id,
        studentId: application.studentId, asesorUserId: notifCtx.asesorUserId, projectTitle: notifCtx.projectTitle,
      },
      'application-service',
    );

    return saved;
  }

  /** El admin extiende un plazo vencido (o por vencer) del anteproyecto. */
  async extendAnteproyectoDeadline(applicationId: string, adminId: string, dto: ExtendDeadlineDto): Promise<AcademicSubmission> {
    const submission = await this.getAnteproyectoSubmission(applicationId);
    const holidays = await this.getHolidays();
    const newDeadline = addBusinessDays(new Date(), dto.businessDays, holidays);

    if (dto.target === 'review') {
      if (![SubmissionStatus.SUBMITTED, SubmissionStatus.REVISED, SubmissionStatus.UNDER_REVIEW, SubmissionStatus.EXPIRED].includes(submission.status)) {
        throw new BadRequestException(`No hay un plazo de revisión activo en estado "${submission.status}"`);
      }
      if (submission.status === SubmissionStatus.EXPIRED) {
        submission.status = submission.versionNumber <= 1 ? SubmissionStatus.SUBMITTED : SubmissionStatus.REVISED;
      }
      submission.deadlineForReview = newDeadline;
    } else {
      if (![SubmissionStatus.NEEDS_REVISION, SubmissionStatus.EXPIRED].includes(submission.status)) {
        throw new BadRequestException(`No hay un plazo de respuesta del estudiante activo en estado "${submission.status}"`);
      }
      if (submission.status === SubmissionStatus.EXPIRED) {
        submission.status = SubmissionStatus.NEEDS_REVISION;
      }
      submission.deadlineForStudent = newDeadline;
    }

    const saved = await this.submissionRepo.save(submission);

    await this.submissionHistoryRepo.save(
      this.submissionHistoryRepo.create({
        submissionId: saved.id,
        action: SubmissionHistoryAction.DEADLINE_EXTENDED,
        actorId: adminId,
        actorRole: 'admin',
        comment: `Plazo de ${dto.target === 'review' ? 'revisión del jurado' : 'respuesta del estudiante'} extendido ${dto.businessDays} día(s) hábil(es)${dto.reason ? `: ${dto.reason}` : ''}`,
      }),
    );

    const application = await this.findApplicationById(applicationId);
    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);
    await this.eventPublisher.publish(
      'academic.anteproyecto.deadline_extended',
      {
        applicationId,
        submissionId: saved.id,
        target: dto.target,
        newDeadline,
        extendedBy: adminId,
        studentId: application.studentId,
        asesorUserId: notifCtx.asesorUserId,
        juradoUserIds: notifCtx.juradoUserIds,
        projectTitle: notifCtx.projectTitle,
      },
      'application-service',
    );

    return saved;
  }

  /** Verificación lazy de plazos vencidos — se ejecuta al consultar el anteproyecto. */
  async checkAnteproyectoExpiry(applicationId: string): Promise<AcademicSubmission> {
    const submission = await this.getAnteproyectoSubmission(applicationId);
    const now = new Date();

    const reviewExpired = submission.deadlineForReview && now > new Date(submission.deadlineForReview) &&
      [SubmissionStatus.SUBMITTED, SubmissionStatus.REVISED, SubmissionStatus.UNDER_REVIEW].includes(submission.status);
    const studentExpired = submission.deadlineForStudent && now > new Date(submission.deadlineForStudent) &&
      submission.status === SubmissionStatus.NEEDS_REVISION;

    if (reviewExpired || studentExpired) {
      submission.status = SubmissionStatus.EXPIRED;
      const saved = await this.submissionRepo.save(submission);

      await this.submissionHistoryRepo.save(
        this.submissionHistoryRepo.create({
          submissionId: saved.id,
          action: SubmissionHistoryAction.EXPIRED,
          actorId: applicationId,
          actorRole: 'system',
          comment: reviewExpired ? 'Plazo de revisión del jurado vencido' : 'Plazo de respuesta del estudiante vencido',
        }),
      );

      await this.eventPublisher.publish(
        'academic.anteproyecto.expired',
        { applicationId, submissionId: saved.id },
        'application-service',
      );

      return saved;
    }

    return submission;
  }

  // ──────────────────────────────────────────────────────────────────
  // COMENTARIOS EN ENTREGABLES
  // ──────────────────────────────────────────────────────────────────

  async addDeliverableComment(
    deliverableId: string,
    authorId: string,
    authorRole: string,
    dto: CreateDeliverableCommentDto,
  ): Promise<DeliverableComment> {
    const deliverable = await this.deliverableRepo.findOne({ where: { id: deliverableId } });
    if (!deliverable) throw new NotFoundException('Entregable no encontrado');

    // El asesor comentando en un entregable propio solo puede marcarlo interno (regla de visibilidad ya
    // se resuelve al leer: is_internal=true nunca lo ve la empresa, is_internal=false + requesterType=asesor
    // tampoco lo ve la empresa porque no ve el entregable).
    const comment = this.deliverableCommentRepo.create({
      deliverableId,
      parentId: dto.parentId ?? null,
      authorId,
      authorRole,
      content: dto.content,
      isInternal: dto.isInternal ?? false,
      attachmentFileId: dto.attachmentFileId ?? null,
    });

    return this.deliverableCommentRepo.save(comment);
  }

  async getDeliverableComments(deliverableId: string, viewerRole: string): Promise<DeliverableComment[]> {
    const deliverable = await this.deliverableRepo.findOne({ where: { id: deliverableId } });
    if (!deliverable) throw new NotFoundException('Entregable no encontrado');

    if (viewerRole === 'company' && deliverable.requesterType === RequesterType.ASESOR) {
      throw new ForbiddenException('No tienes acceso a este entregable');
    }

    const comments = await this.deliverableCommentRepo.find({
      where: { deliverableId },
      order: { createdAt: 'ASC' },
    });

    // `viewerRole` es el rol *contextual* (student | company | asesor | admin…),
    // no el rol global. Los comentarios internos son de coordinación académica.
    const canSeeInternal = viewerRole === 'admin' || viewerRole === 'asesor';
    return canSeeInternal ? comments : comments.filter((c) => !c.isInternal);
  }

  // ──────────────────────────────────────────────────────────────────
  // ACUERDO DE INICIACIÓN
  // ──────────────────────────────────────────────────────────────────

  async getAcademicRecord(applicationId: string): Promise<ProjectAcademicRecord> {
    const record = await this.academicRecordRepo.findOne({ where: { applicationId } });
    if (!record) throw new NotFoundException('No existe registro académico para esta postulación');
    return record;
  }

  /** Checklist de precondiciones para poder cargar el acuerdo de iniciación (sin cargarlo). */
  async getInitiationChecklist(applicationId: string): Promise<{
    anteproyectoApproved: boolean;
    mandatoryDocumentsApproved: boolean;
    readyForAgreement: boolean;
  }> {
    const submission = await this.submissionRepo.findOne({
      where: { applicationId, submissionType: SubmissionType.ANTEPROYECTO },
    });
    const anteproyectoApproved = submission?.status === SubmissionStatus.APPROVED;

    const documents = await this.documentRepo.find({ where: { applicationId } });
    const projectRequirements = await this.getProjectDocumentRequirements(applicationId);
    const mandatoryIds = projectRequirements.filter((r) => r.isMandatory).map((r) => r.id);
    const mandatoryDocumentsApproved = mandatoryIds.every((id) =>
      documents.some((d) => d.requirementId === id && d.status === 'approved'),
    );

    return {
      anteproyectoApproved,
      mandatoryDocumentsApproved,
      readyForAgreement: anteproyectoApproved && mandatoryDocumentsApproved,
    };
  }

  async uploadInitiationAgreement(
    applicationId: string,
    adminId: string,
    dto: UploadInitiationAgreementDto,
  ): Promise<ProjectAcademicRecord> {
    const application = await this.findApplicationById(applicationId);
    const record = await this.getAcademicRecord(applicationId);

    if (record.initiationAgreementFileId) {
      throw new BadRequestException('El acuerdo de iniciación ya fue cargado para esta postulación');
    }

    const checklist = await this.getInitiationChecklist(applicationId);
    if (!checklist.readyForAgreement) {
      throw new BadRequestException(
        'No se cumplen las precondiciones para cargar el acuerdo de iniciación: ' +
          JSON.stringify(checklist),
      );
    }

    const officialStartDate = new Date();
    const expectedEndDate = new Date(officialStartDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + dto.agreedDurationWeeks * 7);

    record.initiationAgreementFileId = dto.fileId;
    record.officialStartDate = officialStartDate as any;
    record.agreedDurationWeeks = dto.agreedDurationWeeks;
    record.expectedEndDate = expectedEndDate as any;
    record.status = AcademicRecordStatus.ACTIVE;

    const saved = await this.academicRecordRepo.save(record);
    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);

    await this.eventPublisher.publish(
      'academic.agreement.uploaded',
      {
        applicationId,
        academicRecordId: saved.id,
        studentId: application.studentId,
        projectId: application.projectId,
        companyUserId: notifCtx.companyUserId,
        asesorUserId: notifCtx.asesorUserId,
        projectTitle: notifCtx.projectTitle,
        officialStartDate: saved.officialStartDate,
        expectedEndDate: saved.expectedEndDate,
        forceEmail: dto.notifyByEmail !== false,
      },
      'application-service',
    );

    return saved;
  }

  // ──────────────────────────────────────────────────────────────────
  // BARRA DE PROGRESO (50% temporal + 50% entregables)
  // ──────────────────────────────────────────────────────────────────

  async getProgress(applicationId: string): Promise<{
    temporalProgress: number;
    deliverableProgress: number;
    overallProgress: number;
    alertLevel: 'on_track' | 'at_risk' | 'delayed';
    officialStartDate: Date | null;
    expectedEndDate: Date | null;
  }> {
    const record = await this.getAcademicRecord(applicationId);

    let temporalProgress = 0;
    if (record.officialStartDate && record.expectedEndDate) {
      const start = new Date(record.officialStartDate).getTime();
      const end = new Date(record.expectedEndDate).getTime();
      const now = Date.now();
      temporalProgress = Math.min(Math.max((now - start) / (end - start), 0), 1) * 100;
    }

    const deliverables = await this.deliverableRepo.find({ where: { applicationId } });
    const totalDeliverables = deliverables.length;
    const approvedDeliverables = deliverables.filter((d) => d.status === DeliverableStatus.APPROVED).length;
    const deliverableProgress = totalDeliverables > 0 ? (approvedDeliverables / totalDeliverables) * 100 : 100;

    const overallProgress = totalDeliverables > 0
      ? temporalProgress * 0.5 + deliverableProgress * 0.5
      : temporalProgress;

    let alertLevel: 'on_track' | 'at_risk' | 'delayed' = 'on_track';
    if (deliverableProgress < temporalProgress - 40 || (temporalProgress >= 100 && overallProgress < 100)) {
      alertLevel = 'delayed';
    } else if (deliverableProgress < temporalProgress - 20) {
      alertLevel = 'at_risk';
    }

    if (temporalProgress >= 90 && !record.progressAlertSent && record.status === AcademicRecordStatus.ACTIVE) {
      record.progressAlertSent = true;
      await this.academicRecordRepo.save(record);

      const application = await this.findApplicationById(applicationId);
      const notifCtx = await this.getNotificationContext(applicationId, application.projectId);
      await this.eventPublisher.publish(
        'academic.progress.near_completion',
        {
          applicationId,
          studentId: application.studentId,
          asesorUserId: notifCtx.asesorUserId,
          projectTitle: notifCtx.projectTitle,
          temporalProgress: Math.round(temporalProgress),
        },
        'application-service',
      );
    }

    return {
      temporalProgress: Math.round(temporalProgress * 100) / 100,
      deliverableProgress: Math.round(deliverableProgress * 100) / 100,
      overallProgress: Math.round(overallProgress * 100) / 100,
      alertLevel,
      officialStartDate: record.officialStartDate,
      expectedEndDate: record.expectedEndDate,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // ESTADÍSTICAS (uso interno — analytics)
  // ──────────────────────────────────────────────────────────────────

  async getAcademicRecordStats(): Promise<{
    totalRecords: number;
    byStatus: Record<string, number>;
    completedCount: number;
    avgDurationDays: number | null;
    avgAnteproyectoCorrections: number | null;
  }> {
    const records = await this.academicRecordRepo.find();
    const submissions = await this.submissionRepo.find({ where: { submissionType: SubmissionType.ANTEPROYECTO } });

    const byStatus: Record<string, number> = {};
    const durationsDays: number[] = [];

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      if (r.status === AcademicRecordStatus.COMPLETED && r.officialStartDate && r.actualEndDate) {
        const days = (new Date(r.actualEndDate).getTime() - new Date(r.officialStartDate).getTime()) / (1000 * 60 * 60 * 24);
        durationsDays.push(days);
      }
    }

    const completedSubmissions = submissions.filter((s) => s.status === SubmissionStatus.APPROVED);
    const avgCorrections = completedSubmissions.length
      ? completedSubmissions.reduce((sum, s) => sum + s.correctionCount, 0) / completedSubmissions.length
      : null;

    return {
      totalRecords: records.length,
      byStatus,
      completedCount: byStatus[AcademicRecordStatus.COMPLETED] ?? 0,
      avgDurationDays: durationsDays.length
        ? Math.round((durationsDays.reduce((sum, d) => sum + d, 0) / durationsDays.length) * 100) / 100
        : null,
      avgAnteproyectoCorrections: avgCorrections !== null ? Math.round(avgCorrections * 100) / 100 : null,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // COLA DE TRABAJO ACADÉMICO (ADMIN)
  // ──────────────────────────────────────────────────────────────────

  /**
   * Postulaciones aceptadas sin registro académico todavía — `accepted` (sin asesor
   * asignado) o `pending_supervisor` (asesor asignado, esperando su aceptación).
   * No tienen `ProjectAcademicRecord`, así que no pueden salir de la query principal
   * (basada en esa tabla). Se agregan como filas sintéticas con status virtual
   * `accepted` / `pending_supervisor` para que el admin las vea en la misma cola
   * y navegue a asignar/reasignar asesor sin salir de "Proceso académico".
   */
  private async getPreAssignmentRows(): Promise<{ rows: any[]; counts: Record<string, number> }> {
    const apps = await this.applicationRepo.find({
      where: [
        { status: ApplicationStatus.ACCEPTED },
        { status: ApplicationStatus.PENDING_SUPERVISOR },
      ],
      order: { acceptedAt: 'ASC' },
    });
    if (apps.length === 0) return { rows: [], counts: {} };

    const studentIds = [...new Set(apps.map((a) => a.studentId))];
    const projectIds = [...new Set(apps.map((a) => a.projectId))];
    let userProfiles: { userId: string; firstName: string; lastName: string }[] = [];
    let projectInfos: { id: string; title: string; companyId: string }[] = [];
    try {
      userProfiles = await this.httpClient.post('user', '/internal/users/batch-basic', { userIds: studentIds });
    } catch (err) {
      this.logger.warn(`No se pudo obtener perfiles de estudiantes: ${err.message}`);
    }
    try {
      projectInfos = await this.httpClient.post('project', '/internal/projects/batch-basic', { projectIds });
    } catch (err) {
      this.logger.warn(`No se pudo obtener info de proyectos: ${err.message}`);
    }
    const userMap = new Map(userProfiles.map((u) => [u.userId, u]));
    const projectMap = new Map(projectInfos.map((p) => [p.id, p]));

    const counts: Record<string, number> = {};
    const rows = apps.map((app) => {
      counts[app.status] = (counts[app.status] ?? 0) + 1;
      const user = userMap.get(app.studentId);
      const project = projectMap.get(app.projectId);
      return {
        id: null,
        applicationId: app.id,
        status: app.status, // 'accepted' | 'pending_supervisor' — dominio 'application', no 'academicRecord'
        officialStartDate: null,
        expectedEndDate: null,
        agreedDurationWeeks: null,
        asesorCompletionSignal: null,
        createdAt: app.acceptedAt ?? app.appliedAt,
        updatedAt: app.acceptedAt ?? app.appliedAt,
        projectId: app.projectId,
        studentId: app.studentId,
        studentName: user ? `${user.firstName} ${user.lastName}` : app.studentId,
        applicationStatus: app.status,
        projectTitle: project?.title ?? null,
        isPreAssignment: true,
      };
    });

    return { rows, counts };
  }

  async getAcademicQueue(query: { status?: string; page?: number; limit?: number }): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    statusCounts: Record<string, number>;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const offset = (page - 1) * limit;

    const preAssignmentStatuses = [ApplicationStatus.ACCEPTED, ApplicationStatus.PENDING_SUPERVISOR];
    if (query.status && preAssignmentStatuses.includes(query.status as ApplicationStatus)) {
      const { rows, counts } = await this.getPreAssignmentRows();
      const filtered = rows.filter((r) => r.status === query.status);
      const allCounts = await this.academicRecordRepo
        .createQueryBuilder('r')
        .select('r.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .groupBy('r.status')
        .getRawMany();
      const statusCounts: Record<string, number> = { ...counts };
      for (const row of allCounts) statusCounts[row.status] = parseInt(row.count, 10);
      const paged = filtered.slice(offset, offset + limit);
      return {
        data: paged, total: filtered.length, page, limit,
        totalPages: Math.ceil(filtered.length / limit), statusCounts,
      };
    }

    const excludedStatuses = [AcademicRecordStatus.COMPLETED, AcademicRecordStatus.CANCELLED];
    const statusFilter = query.status && Object.values(AcademicRecordStatus).includes(query.status as AcademicRecordStatus)
      ? [query.status as AcademicRecordStatus]
      : null;

    const qb = this.academicRecordRepo
      .createQueryBuilder('r')
      .select([
        'r.id', 'r.applicationId', 'r.status', 'r.officialStartDate',
        'r.expectedEndDate', 'r.agreedDurationWeeks',
        'r.asesorCompletionSignal', 'r.createdAt', 'r.updatedAt',
      ]);

    if (statusFilter) {
      qb.where('r.status IN (:...statuses)', { statuses: statusFilter });
    } else {
      qb.where('r.status NOT IN (:...excluded)', { excluded: excludedStatuses });
    }

    qb.orderBy('r.updatedAt', 'DESC');

    const [records, total] = await qb.skip(offset).take(limit).getManyAndCount();

    const appIds = records.map((r) => r.applicationId);
    const apps = appIds.length
      ? await this.applicationRepo.find({ where: { id: In(appIds) }, select: ['id', 'projectId', 'studentId', 'status'] })
      : [];
    const appMap = new Map(apps.map((a) => [a.id, a]));

    const projectIds = [...new Set(apps.map((a) => a.projectId))];
    let projectMap = new Map<string, string>();
    if (projectIds.length) {
      try {
        const projects = await this.httpClient.post<any[]>('project', `/internal/projects/batch-basic`, { projectIds });
        if (Array.isArray(projects)) {
          projectMap = new Map(projects.map((p: any) => [p.id, p.title]));
        }
      } catch {
        // project titles not critical
      }
    }

    const data = records.map((r) => {
      const app = appMap.get(r.applicationId);
      return {
        ...r,
        projectId: app?.projectId ?? null,
        studentId: app?.studentId ?? null,
        applicationStatus: app?.status ?? null,
        projectTitle: projectMap.get(app?.projectId ?? '') ?? null,
      };
    });

    const allCounts = await this.academicRecordRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('r.status')
      .getRawMany();
    const statusCounts: Record<string, number> = {};
    for (const row of allCounts) {
      statusCounts[row.status] = parseInt(row.count, 10);
    }

    // Vista "Todos" (sin filtro): antepone las postulaciones pre-registro académico
    // (accepted / pending_supervisor) para que el admin las vea sin cambiar de pantalla.
    if (!statusFilter) {
      const { rows: preRows, counts: preCounts } = await this.getPreAssignmentRows();
      Object.assign(statusCounts, preCounts);
      const merged = [...preRows, ...data].slice(0, limit);
      return {
        data: merged,
        total: total + preRows.length,
        page, limit,
        totalPages: Math.ceil((total + preRows.length) / limit),
        statusCounts,
      };
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit), statusCounts };
  }

  // ──────────────────────────────────────────────────────────────────
  // FINALIZACIÓN Y SUSTENTACIÓN
  // ──────────────────────────────────────────────────────────────────

  /**
   * El admin inicia la fase de finalización definiendo la lista de documentos
   * finales requeridos ad-hoc para ese proyecto. Los documentos son visibles
   * en el workspace y los sube quien corresponda (estudiante, empresa o asesor).
   */
  async startFinalization(
    applicationId: string,
    adminId: string,
    dto: StartFinalizationDto,
  ): Promise<ProjectAcademicRecord> {
    const record = await this.getAcademicRecord(applicationId);
    if (record.status !== AcademicRecordStatus.ACTIVE) {
      throw new BadRequestException(`No se puede iniciar la finalización desde el estado "${record.status}"`);
    }

    if (!dto?.finalDocs?.length) {
      throw new BadRequestException('Debes definir al menos un documento final requerido');
    }

    // Evitar duplicados al reintentar
    const existing = await this.finalDocReqRepo.count({ where: { applicationId } });
    if (existing > 0) {
      throw new BadRequestException('Ya existen documentos finales definidos para este proyecto');
    }

    const requirements = dto.finalDocs.map((item, index) =>
      this.finalDocReqRepo.create({
        applicationId,
        name: item.name,
        description: item.description ?? null,
        actorType: item.actorType,
        isMandatory: item.isMandatory ?? true,
        displayOrder: index,
        createdBy: adminId,
      }),
    );
    await this.finalDocReqRepo.save(requirements);

    record.status = AcademicRecordStatus.WAITING_FINAL_DOCS;
    const saved = await this.academicRecordRepo.save(record);

    const application = await this.findApplicationById(applicationId);
    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);
    await this.eventPublisher.publish(
      'academic.finalization.started',
      {
        applicationId,
        studentId: application.studentId,
        companyUserId: notifCtx.companyUserId,
        asesorUserId: notifCtx.asesorUserId,
        projectTitle: notifCtx.projectTitle,
        finalDocsCount: requirements.length,
        finalDocsByActor: {
          student: requirements.filter((r) => r.actorType === FinalDocActorType.STUDENT).length,
          company: requirements.filter((r) => r.actorType === FinalDocActorType.COMPANY).length,
          asesor: requirements.filter((r) => r.actorType === FinalDocActorType.ASESOR).length,
        },
      },
      'application-service',
    );

    return saved;
  }

  /**
   * El admin revisa el avance de documentos finales y avanza el estado:
   * si todos los mandatory de stage=finalization están aprobados, pasa a finalizar.
   */
  async advanceFinalization(applicationId: string): Promise<{ record: ProjectAcademicRecord; pendingDocs: { id: string; name: string; actorType: string }[] }> {
    const record = await this.getAcademicRecord(applicationId);
    if (record.status !== AcademicRecordStatus.WAITING_FINAL_DOCS && record.status !== AcademicRecordStatus.FINAL_DOCS_REVIEW) {
      throw new BadRequestException(`No se puede avanzar la finalización desde el estado "${record.status}"`);
    }

    // Documentos finales ad-hoc definidos al iniciar finalización
    const finalRequirements = await this.finalDocReqRepo.find({
      where: { applicationId },
      order: { displayOrder: 'ASC' },
    });
    const finalDocuments = await this.documentRepo.find({
      where: { applicationId, stage: ProjectDocumentStage.FINAL },
    });

    const mandatoryList = finalRequirements.filter((r) => r.isMandatory);
    const pendingDocs = mandatoryList
      .filter((r) => !finalDocuments.some((d) => d.requirementId === r.id && d.status === ProjectDocumentStatus.APPROVED))
      .map((r) => ({ id: r.id, name: r.name, actorType: r.actorType }));

    if (pendingDocs.length > 0) {
      record.status = AcademicRecordStatus.FINAL_DOCS_REVIEW;
      const saved = await this.academicRecordRepo.save(record);
      return { record: saved, pendingDocs };
    }

    record.status = AcademicRecordStatus.FINALIZING;
    const saved = await this.academicRecordRepo.save(record);
    return { record: saved, pendingDocs: [] };
  }

  // ──────────────────────────────────────────────────────────────────
  // DOCUMENTOS FINALES (AD-HOC POR PROYECTO)
  // ──────────────────────────────────────────────────────────────────

  /** Lista los requisitos de docs finales del proyecto junto con lo subido hasta ahora. */
  async getFinalDocuments(applicationId: string): Promise<{
    requirements: FinalDocumentRequirement[];
    documents: ProjectDocument[];
  }> {
    await this.findApplicationById(applicationId);
    const [requirements, documents] = await Promise.all([
      this.finalDocReqRepo.find({
        where: { applicationId },
        order: { displayOrder: 'ASC' },
      }),
      this.documentRepo.find({
        where: { applicationId, stage: ProjectDocumentStage.FINAL },
        order: { updatedAt: 'DESC' },
      }),
    ]);
    return { requirements, documents };
  }

  /** El actor asignado (estudiante, empresa o asesor) sube su documento final. */
  async uploadFinalDocument(
    applicationId: string,
    uploaderId: string,
    uploaderContextRole: string,
    dto: UploadFinalDocumentDto,
  ): Promise<ProjectDocument> {
    const application = await this.findApplicationById(applicationId);
    const requirement = await this.finalDocReqRepo.findOne({
      where: { id: dto.finalRequirementId, applicationId },
    });
    if (!requirement) throw new NotFoundException('Documento final requerido no encontrado');

    // El actor asignado debe coincidir con el uploader (el admin puede suplir a cualquiera).
    if (uploaderContextRole !== 'admin' && uploaderContextRole !== requirement.actorType) {
      throw new ForbiddenException(
        `Este documento debe subirlo ${this.actorLabel(requirement.actorType)}, no ${uploaderContextRole}`,
      );
    }

    let document = await this.documentRepo.findOne({
      where: {
        applicationId,
        requirementId: requirement.id,
        stage: ProjectDocumentStage.FINAL,
      },
    });

    if (!document) {
      document = this.documentRepo.create({
        applicationId,
        requirementId: requirement.id,
        requirementName: requirement.name,
        stage: ProjectDocumentStage.FINAL,
        actorType: requirement.actorType,
      });
    }

    document.submittedBy = uploaderId;
    document.fileId = dto.fileId;
    document.status = ProjectDocumentStatus.SUBMITTED;
    document.submittedAt = new Date();
    document.reviewerComment = null;

    const saved = await this.documentRepo.save(document);

    await this.eventPublisher.publish(
      'academic.final_document.submitted',
      {
        documentId: saved.id,
        applicationId,
        requirementName: saved.requirementName,
        actorType: requirement.actorType,
        studentId: application.studentId,
        submittedBy: uploaderId,
      },
      'application-service',
    );

    return saved;
  }

  // `string` (no `FinalDocActorType`): también se usa para `DocumentActorType`
  // (documentos iniciales, solo student/company), un enum distinto pero con
  // los mismos valores string subyacentes.
  private actorLabel(actor: string): string {
    const map: Record<string, string> = {
      [FinalDocActorType.STUDENT]: 'el estudiante',
      [FinalDocActorType.COMPANY]: 'la empresa',
      [FinalDocActorType.ASESOR]: 'el asesor',
    };
    return map[actor] ?? actor;
  }

  /** El admin carga la nota final y marca el proyecto como completado. */
  async uploadFinalGrade(applicationId: string, adminId: string, dto: UploadFinalGradeDto): Promise<ProjectAcademicRecord> {
    const record = await this.getAcademicRecord(applicationId);
    if (record.status !== AcademicRecordStatus.FINALIZING) {
      throw new BadRequestException(`No se puede cargar la nota final desde el estado "${record.status}"`);
    }

    record.finalGradeFileId = dto.fileId;
    if (dto.gradeValue !== undefined && dto.gradeValue !== null) {
      record.finalGradeValue = dto.gradeValue.toFixed(2);
    }
    record.actualEndDate = new Date() as any;
    record.status = AcademicRecordStatus.COMPLETED;
    const saved = await this.academicRecordRepo.save(record);

    const application = await this.findApplicationById(applicationId);
    application.status = ApplicationStatus.COMPLETED;
    application.completedAt = new Date();
    await this.applicationRepo.save(application);

    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);
    await this.eventPublisher.publish(
      'academic.completed',
      {
        applicationId,
        projectId: application.projectId,
        studentId: application.studentId,
        companyUserId: notifCtx.companyUserId,
        asesorUserId: notifCtx.asesorUserId,
        projectTitle: notifCtx.projectTitle,
        forceEmail: dto.notifyByEmail !== false,
      },
      'application-service',
    );

    return saved;
  }

  /**
   * El admin cancela el proceso de finalización (o el proyecto entero en cualquier
   * momento tras iniciarse el desarrollo). Marca el record como CANCELLED y la
   * postulación como REJECTED — el proyecto queda cerrado sin evaluación.
   */
  async cancelFinalization(applicationId: string, adminId: string, reason?: string): Promise<ProjectAcademicRecord> {
    const record = await this.getAcademicRecord(applicationId);
    const terminal = [AcademicRecordStatus.COMPLETED, AcademicRecordStatus.CANCELLED];
    if (terminal.includes(record.status)) {
      throw new BadRequestException(`No se puede cancelar un record en estado "${record.status}"`);
    }

    record.status = AcademicRecordStatus.CANCELLED;
    record.cancellationReason = reason ?? null;
    record.actualEndDate = new Date() as any;
    const saved = await this.academicRecordRepo.save(record);

    const application = await this.findApplicationById(applicationId);
    application.status = ApplicationStatus.REJECTED;
    await this.applicationRepo.save(application);

    const notifCtx = await this.getNotificationContext(applicationId, application.projectId);
    await this.eventPublisher.publish(
      'academic.cancelled',
      {
        applicationId,
        studentId: application.studentId,
        companyUserId: notifCtx.companyUserId,
        asesorUserId: notifCtx.asesorUserId,
        projectTitle: notifCtx.projectTitle,
        reason: reason ?? null,
        cancelledBy: adminId,
      },
      'application-service',
    );

    return saved;
  }
}

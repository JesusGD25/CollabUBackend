import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { Application, ApplicationStatus } from './entities/application.entity';
import { Interview } from './entities/interview.entity';
import { AcademicRecordStatus, ProjectAcademicRecord } from './entities/project-academic-record.entity';

/**
 * Rol del usuario *dentro de un proyecto concreto*.
 *
 * No confundir con `UserRole` (student | company | faculty | admin), que es global.
 * Un mismo usuario `faculty` puede ser `asesor` en un proyecto y `jurado_anteproyecto`
 * en otro — e incluso ambos en el mismo, en cuyo caso se prioriza `asesor`.
 */
export type ContextRole =
  | 'student'
  | 'company'
  | 'asesor'
  | 'jurado_anteproyecto'
  | 'jurado_final'
  | 'admin';

export type Permission =
  // Lectura general
  | 'view_project'
  | 'view_candidate'
  | 'view_private_notes'
  | 'view_progress'
  | 'view_academic_record'
  | 'view_activity'
  // Postulación
  | 'change_application_status'
  | 'withdraw_application'
  | 'manage_private_notes'
  // Entrevistas
  | 'manage_interviews'
  | 'submit_interview_solution'
  | 'comment_interview'
  // Anteproyecto
  | 'view_anteproyecto'
  | 'submit_anteproyecto'
  | 'comment_anteproyecto'
  | 'review_anteproyecto'
  | 'extend_deadline'
  // Documentos
  | 'view_documents'
  | 'upload_document'
  | 'review_document'
  | 'manage_document_requirements'
  // Documentos de selección (solicitados por la empresa antes del inicio)
  | 'view_selection_documents'
  | 'request_selection_document'
  | 'upload_selection_document'
  | 'review_selection_document'
  // Entregables
  | 'view_deliverables'
  | 'create_deliverable'
  | 'submit_deliverable'
  | 'review_deliverable'
  | 'comment_deliverable'
  | 'view_final_documents'
  | 'upload_final_document'
  | 'review_final_document'
  // Gestión académica
  | 'manage_initiation_agreement'
  | 'manage_finalization'
  | 'manage_participants'
  // Comunicación
  | 'chat';

export interface ViewerContext {
  userId: string;
  userRole: string;
  contextRole: ContextRole;
  /** Todas las asignaciones del usuario en este proyecto (un docente puede tener varias). */
  assignments: { assignmentId: string; role: string; status: string }[];
  permissions: Permission[];
}

export interface ParticipantInfo {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: ContextRole;
  assignmentId: string | null;
  assignmentStatus: string | null;
}

export interface PendingAction {
  type: string;
  label: string;
  description: string | null;
  dueDate: string | null;
  severity: 'info' | 'warning' | 'danger';
  targetTab: string;
}

export interface ProjectStageInfo {
  current: string;
  completed: string[];
  waitingOn: ContextRole | null;
}

/**
 * Permisos por rol contextual.
 *
 * Decisiones de negocio fijadas (2026-08-10):
 * - El jurado ve ÚNICAMENTE su etapa. No accede a entregables de desarrollo,
 *   ni al progreso, ni al chat del proyecto.
 * - Crear y revisar entregables queda restringido al asesor (más empresa y admin).
 *   Un jurado de anteproyecto no puede hacerlo, aunque sea `faculty`.
 * - Las notas privadas de la empresa sobre el candidato no las ve NADIE más,
 *   ni siquiera el administrador.
 * - La empresa tiene acceso completo al anteproyecto (documento, historial y comentarios).
 */
const PERMISSIONS_BY_ROLE: Record<ContextRole, Permission[]> = {
  student: [
    'view_project',
    'view_progress',
    'view_academic_record',
    'view_activity',
    'withdraw_application',
    'submit_interview_solution',
    'comment_interview',
    'view_selection_documents',
    'upload_selection_document',
    'view_anteproyecto',
    'submit_anteproyecto',
    'view_documents',
    'upload_document',
    'view_deliverables',
    'submit_deliverable',
    'comment_deliverable',
    'view_final_documents',
    'upload_final_document',
    'chat',
  ],
  company: [
    'view_project',
    'view_candidate',
    'view_private_notes',
    'manage_private_notes',
    'view_progress',
    'view_academic_record',
    'view_activity',
    'change_application_status',
    'manage_interviews',
    'view_selection_documents',
    'request_selection_document',
    'review_selection_document',
    'view_anteproyecto',
    'view_documents',
    'upload_document',
    'view_deliverables',
    'create_deliverable',
    'review_deliverable',
    'comment_deliverable',
    'view_final_documents',
    'upload_final_document',
    'chat',
  ],
  asesor: [
    'view_project',
    'view_candidate',
    'view_progress',
    'view_academic_record',
    'view_activity',
    'view_anteproyecto',
    'comment_anteproyecto',
    'view_documents',
    'view_deliverables',
    'create_deliverable',
    'review_deliverable',
    'comment_deliverable',
    'view_final_documents',
    'upload_final_document',
    'chat',
  ],
  // Alcance estricto: solo el anteproyecto.
  jurado_anteproyecto: ['view_project', 'view_anteproyecto', 'review_anteproyecto'],
  // Alcance estricto: solo los documentos finales.
  jurado_final: ['view_project', 'view_documents', 'review_document'],
  admin: [
    'view_project',
    'view_candidate',
    'view_progress',
    'view_academic_record',
    'view_activity',
    'change_application_status',
    'manage_interviews',
    'view_anteproyecto',
    'extend_deadline',
    'view_documents',
    'review_document',
    'manage_document_requirements',
    'view_deliverables',
    'create_deliverable',
    'review_deliverable',
    'comment_deliverable',
    'manage_initiation_agreement',
    'manage_finalization',
    'manage_participants',
    'view_final_documents',
    'upload_final_document',
    'review_final_document',
    'chat',
  ],
};

/** Prioridad cuando un mismo docente tiene varias asignaciones en el mismo proyecto. */
const ASSIGNMENT_ROLE_PRIORITY: ContextRole[] = [
  'asesor',
  'jurado_anteproyecto',
  'jurado_final',
];

/** Asignaciones que ya no otorgan acceso. */
const INACTIVE_ASSIGNMENT_STATUSES = ['declined', 'disconnected', 'replaced'];

interface AdminAssignment {
  id: string;
  supervisorId: string;
  supervisorUserId: string;
  role: string;
  status: string;
}

interface ProjectBasic {
  id: string;
  title: string;
  companyId: string;
  createdByUserId: string;
}

interface UserBasic {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl?: string | null;
}

/**
 * Resuelve quién es el usuario dentro de un proyecto y qué puede hacer.
 *
 * Es el único punto del servicio que decide acceso. Todo endpoint de lectura o
 * escritura sobre una postulación debe pasar por `assertAccess` o `assertPermission`.
 */
@Injectable()
export class ProjectAccessService {
  private readonly logger = new Logger(ProjectAccessService.name);

  constructor(private readonly httpClient: MicroserviceHttpClient) {}

  // ──────────────────────────────────────────────────────────────────
  // RESOLUCIÓN DEL VISOR
  // ──────────────────────────────────────────────────────────────────

  /**
   * Devuelve el contexto del usuario en la postulación, o `null` si no participa.
   * El administrador siempre participa.
   */
  async resolveViewer(application: Application, user: { id: string; role: string }): Promise<ViewerContext | null> {
    const userId = user.id;

    if (user.role === 'admin') {
      return this.buildViewer(userId, user.role, 'admin', []);
    }

    if (application.studentId === userId) {
      return this.buildViewer(userId, user.role, 'student', []);
    }

    if (await this.isProjectOwner(application.projectId, userId)) {
      return this.buildViewer(userId, user.role, 'company', []);
    }

    const assignments = await this.getAssignments(application.id);
    const mine = assignments.filter(
      (a) => a.supervisorUserId === userId && !INACTIVE_ASSIGNMENT_STATUSES.includes(a.status),
    );

    if (mine.length === 0) return null;

    const contextRole = this.pickPrimaryRole(mine.map((a) => a.role));
    if (!contextRole) return null;

    return this.buildViewer(
      userId,
      user.role,
      contextRole,
      mine.map((a) => ({ assignmentId: a.id, role: a.role, status: a.status })),
    );
  }

  /** Igual que `resolveViewer`, pero lanza 403 si el usuario no participa. */
  async assertAccess(application: Application, user: { id: string; role: string }): Promise<ViewerContext> {
    const viewer = await this.resolveViewer(application, user);
    if (!viewer) {
      throw new ForbiddenException('No tienes acceso a esta postulación');
    }
    return viewer;
  }

  /** Lanza 403 si el usuario no participa o si carece del permiso indicado. */
  async assertPermission(
    application: Application,
    user: { id: string; role: string },
    permission: Permission,
  ): Promise<ViewerContext> {
    const viewer = await this.assertAccess(application, user);
    if (!viewer.permissions.includes(permission)) {
      throw new ForbiddenException(
        `Tu rol en este proyecto (${viewer.contextRole}) no permite esta acción`,
      );
    }
    return viewer;
  }

  private buildViewer(
    userId: string,
    userRole: string,
    contextRole: ContextRole,
    assignments: { assignmentId: string; role: string; status: string }[],
  ): ViewerContext {
    return {
      userId,
      userRole,
      contextRole,
      assignments,
      permissions: [...PERMISSIONS_BY_ROLE[contextRole]],
    };
  }

  private pickPrimaryRole(roles: string[]): ContextRole | null {
    for (const candidate of ASSIGNMENT_ROLE_PRIORITY) {
      if (roles.includes(candidate)) return candidate;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────
  // SANEAMIENTO
  // ──────────────────────────────────────────────────────────────────

  /**
   * Elimina del payload lo que el visor no tiene derecho a ver.
   *
   * Las notas privadas de la empresa (`notes`, `interviewerNotes`, `resolutionComment`)
   * solo son visibles para la propia empresa.
   */
  sanitizeApplication(app: Application, viewer: ViewerContext): Application {
    const canSeePrivateNotes = viewer.permissions.includes('view_private_notes');
    if (canSeePrivateNotes) return app;

    const sanitized: Application = { ...app, notes: null };
    if (sanitized.interviews) {
      sanitized.interviews = sanitized.interviews.map(
        (i) => ({ ...i, interviewerNotes: null, resolutionComment: null }) as Interview,
      );
    }
    return sanitized;
  }

  // ──────────────────────────────────────────────────────────────────
  // ETAPA DEL CICLO DE VIDA
  // ──────────────────────────────────────────────────────────────────

  /**
   * Las 8 etapas del ciclo académico. Se derivan de `application.status`
   * combinado con `project_academic_record.status`, porque ninguno de los dos
   * describe el ciclo completo por sí solo.
   */
  resolveStage(app: Application, record: ProjectAcademicRecord | null): ProjectStageInfo {
    const order = [
      'application',
      'selection',
      'academic_assignment',
      'anteproyecto',
      'documents',
      'agreement',
      'development',
      'closure',
    ];

    const stageFor = (): { current: string; waitingOn: ContextRole | null } => {
      switch (app.status) {
        case ApplicationStatus.PENDING:
        case ApplicationStatus.UNDER_REVIEW:
          return { current: 'application', waitingOn: 'company' };
        case ApplicationStatus.SHORTLISTED:
        case ApplicationStatus.INTERVIEW:
          return { current: 'selection', waitingOn: 'company' };
        case ApplicationStatus.REJECTED:
        case ApplicationStatus.WITHDRAWN:
        case ApplicationStatus.CANCELLED:
          return { current: 'closed', waitingOn: null };
        default:
          break;
      }

      if (!record) return { current: 'academic_assignment', waitingOn: 'admin' };

      switch (record.status) {
        case AcademicRecordStatus.WAITING_ANTEPROYECTO:
          return { current: 'anteproyecto', waitingOn: 'student' };
        case AcademicRecordStatus.WAITING_DOCUMENTS:
          return { current: 'documents', waitingOn: 'student' };
        case AcademicRecordStatus.WAITING_AGREEMENT:
          return { current: 'agreement', waitingOn: 'admin' };
        case AcademicRecordStatus.ACTIVE:
          return { current: 'development', waitingOn: 'student' };
        case AcademicRecordStatus.WAITING_FINAL_DOCS:
          return { current: 'closure', waitingOn: 'student' };
        case AcademicRecordStatus.FINAL_DOCS_REVIEW:
          return { current: 'closure', waitingOn: 'jurado_final' };
        case AcademicRecordStatus.FINALIZING:
          return { current: 'closure', waitingOn: 'admin' };
        case AcademicRecordStatus.COMPLETED:
          return { current: 'completed', waitingOn: null };
        default:
          return { current: 'closed', waitingOn: null };
      }
    };

    const { current, waitingOn } = stageFor();
    const idx = order.indexOf(current);
    const completed = idx > 0 ? order.slice(0, idx) : current === 'completed' ? order : [];

    return { current, completed, waitingOn };
  }

  // ──────────────────────────────────────────────────────────────────
  // PARTICIPANTES
  // ──────────────────────────────────────────────────────────────────

  async getParticipants(app: Application): Promise<ParticipantInfo[]> {
    const assignments = await this.getAssignments(app.id);
    const project = await this.getProject(app.projectId);

    const activeAssignments = assignments.filter(
      (a) => !INACTIVE_ASSIGNMENT_STATUSES.includes(a.status),
    );

    const userIds = [
      app.studentId,
      ...(project?.createdByUserId ? [project.createdByUserId] : []),
      ...activeAssignments.map((a) => a.supervisorUserId).filter(Boolean),
    ];

    const profiles = await this.getUserProfiles([...new Set(userIds)]);
    const nameOf = (userId: string) => {
      const p = profiles.get(userId);
      if (!p) return null;
      return [p.firstName, p.lastName].filter(Boolean).join(' ') || null;
    };

    const participants: ParticipantInfo[] = [
      {
        userId: app.studentId,
        fullName: nameOf(app.studentId),
        avatarUrl: profiles.get(app.studentId)?.avatarUrl ?? null,
        role: 'student',
        assignmentId: null,
        assignmentStatus: null,
      },
    ];

    if (project?.createdByUserId) {
      participants.push({
        userId: project.createdByUserId,
        fullName: nameOf(project.createdByUserId),
        avatarUrl: profiles.get(project.createdByUserId)?.avatarUrl ?? null,
        role: 'company',
        assignmentId: null,
        assignmentStatus: null,
      });
    }

    for (const a of activeAssignments) {
      if (!a.supervisorUserId) continue;
      participants.push({
        userId: a.supervisorUserId,
        fullName: nameOf(a.supervisorUserId),
        avatarUrl: profiles.get(a.supervisorUserId)?.avatarUrl ?? null,
        role: a.role as ContextRole,
        assignmentId: a.id,
        assignmentStatus: a.status,
      });
    }

    return participants;
  }

  // ──────────────────────────────────────────────────────────────────
  // LLAMADAS ENTRE SERVICIOS
  // ──────────────────────────────────────────────────────────────────

  /**
   * En el modelo actual `projects.company_id` almacena el userId de la cuenta de
   * empresa, igual que `created_by_user_id`. Se comprueban ambos para no depender
   * de esa coincidencia.
   */
  private async isProjectOwner(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    if (!project) return false;
    return project.createdByUserId === userId || project.companyId === userId;
  }

  async getProject(projectId: string): Promise<ProjectBasic | null> {
    try {
      const projects = await this.httpClient.post<ProjectBasic[]>(
        'project',
        '/internal/projects/batch-basic',
        { projectIds: [projectId] },
      );
      return projects?.[0] ?? null;
    } catch (err) {
      this.logger.warn(`No se pudo obtener el proyecto ${projectId}: ${err.message}`);
      return null;
    }
  }

  async getAssignments(applicationId: string): Promise<AdminAssignment[]> {
    try {
      return await this.httpClient.get<AdminAssignment[]>(
        'admin',
        `/internal/admin/assignments/by-application/${applicationId}`,
      );
    } catch (err) {
      this.logger.warn(`No se pudieron obtener las asignaciones de ${applicationId}: ${err.message}`);
      return [];
    }
  }

  private async getUserProfiles(userIds: string[]): Promise<Map<string, UserBasic>> {
    if (userIds.length === 0) return new Map();
    try {
      const profiles = await this.httpClient.post<UserBasic[]>('user', '/internal/users/batch-basic', {
        userIds,
      });
      return new Map(profiles.map((p) => [p.userId, p]));
    } catch (err) {
      this.logger.warn(`No se pudieron obtener perfiles de usuario: ${err.message}`);
      return new Map();
    }
  }
}

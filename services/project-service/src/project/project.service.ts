import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectRequirement } from './entities/project-requirement.entity';
import { ProjectDeliverable } from './entities/project-deliverable.entity';
import { ProjectSkill } from './entities/project-skill.entity';
import { ProjectActivity } from './entities/project-activity.entity';

import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateProjectStatusDto,
  AddProjectRequirementDto,
  AddProjectDeliverableDto,
  ProjectSearchQueryDto,
  CreateActivityDto,
  UpdateActivityDto,
  CreateProjectSkillDto,
  UpdateProjectSkillDto,
} from './dto';

export interface PaginatedProjectsResponse {
  data: any[]; // Usamos any para permitir el mapeo de tags a strings en la respuesta
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Transiciones de estado válidas
const VALID_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  [ProjectStatus.DRAFT]: [ProjectStatus.PENDING_APPROVAL, ProjectStatus.CANCELLED],
  [ProjectStatus.NEEDS_CHANGES]: [ProjectStatus.PENDING_APPROVAL, ProjectStatus.CANCELLED],
  [ProjectStatus.PENDING_APPROVAL]: [ProjectStatus.PUBLISHED, ProjectStatus.NEEDS_CHANGES, ProjectStatus.DRAFT],
  [ProjectStatus.PUBLISHED]: [ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED],
  [ProjectStatus.IN_PROGRESS]: [ProjectStatus.COMPLETED, ProjectStatus.CANCELLED],
  [ProjectStatus.COMPLETED]: [],
  [ProjectStatus.CANCELLED]: [],
};

@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    @InjectRepository(Project) private projectRepo: Repository<Project>,
    @InjectRepository(ProjectRequirement) private requirementRepo: Repository<ProjectRequirement>,
    @InjectRepository(ProjectDeliverable) private deliverableRepo: Repository<ProjectDeliverable>,
    @InjectRepository(ProjectSkill) private skillRepo: Repository<ProjectSkill>,
    @InjectRepository(ProjectActivity) private activityRepo: Repository<ProjectActivity>,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  private formatProject(project: Project): any {
    if (!project) return null;
    return {
      ...project,
      skills: project.skills || [],
    };
  }

  /** Resuelve nombres de habilidad contra el catálogo maestro (admin-service) por nombre normalizado. */
  private async resolveCatalogSkillIds(names: string[]): Promise<Map<string, string | null>> {
    if (!names.length) return new Map();
    try {
      const results = await this.httpClient.post<{ name: string; skillId: string | null }[]>(
        'admin',
        '/internal/admin/skills/by-names',
        { names },
      );
      return new Map(results.map((r) => [r.name, r.skillId]));
    } catch (err) {
      this.logger.warn(`No se pudo resolver catálogo de habilidades: ${err.message}`);
      return new Map();
    }
  }

  private async buildSkillEntities(projectId: string, dtos: CreateProjectSkillDto[]): Promise<ProjectSkill[]> {
    const namesToResolve = dtos.filter((d) => !d.catalogSkillId).map((d) => d.name);
    const resolved = await this.resolveCatalogSkillIds(namesToResolve);
    return dtos.map((dto) =>
      this.skillRepo.create({
        ...dto,
        catalogSkillId: dto.catalogSkillId ?? resolved.get(dto.name) ?? null,
        projectId,
      }),
    );
  }

  // ── PROYECTOS ──

  async createProject(userId: string, companyId: string, dto: CreateProjectDto): Promise<any> {
    // Verificar que la empresa existe y está verificada
    try {
      const companyCheck = await this.httpClient.get<{ exists: boolean; isActive: boolean; isVerified: boolean }>(
        'company',
        `/internal/companies/${companyId}/exists`,
      );
      if (!companyCheck.exists) {
        throw new BadRequestException('La empresa no existe');
      }
      
      // TODO: [TEMPORAL] Verificación de empresa inhabilitada para permitir la 
      // creación de proyectos durante las pruebas. Descomentar en el futuro 
      // cuando el proceso de verificación esté completo en el frontend.
      /*
      if (!companyCheck.isVerified) {
        throw new BadRequestException('La empresa no está verificada');
      }
      */
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.warn(`No se pudo verificar la empresa ${companyId}: ${error.message}`);
    }

    this.validateDates(dto.startDate, dto.endDate, dto.applicationDeadline);
    this.validateHours(dto.weeklyHours, dto.totalHours);

    const project = this.projectRepo.create({
      companyId,
      createdByUserId: userId,
      title: dto.title,
      description: dto.description,
      shortDescription: dto.shortDescription,
      projectType: dto.projectType,
      durationMonths: dto.durationMonths,
      weeklyHours: dto.weeklyHours,
      totalHours: dto.totalHours,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      locationType: dto.locationType,
      location: dto.location,
      compensationType: dto.compensationType,
      compensationAmount: dto.compensationAmount,
      currency: dto.currency,
      positionsAvailable: dto.positionsAvailable,
      applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : undefined,
      academicPrograms: dto.academicPrograms,
      minimumSemester: dto.minimumSemester,
      requestDocumentFileId: dto.requestDocumentFileId ?? null,
    });

    const saved = await this.projectRepo.save(project);

    // Crear habilidades requeridas si se proporcionaron
    if (dto.skills && dto.skills.length > 0) {
      const skills = await this.buildSkillEntities(saved.id, dto.skills);
      await this.skillRepo.save(skills);
    }

    await this.eventPublisher.publish(
      'project.created',
      {
        projectId: saved.id,
        companyId: saved.companyId,
        title: saved.title,
        projectType: saved.projectType,
      },
      'project-service',
    );

    this.logger.log(`Proyecto creado: ${saved.id} por usuario ${userId}`);
    const fullProject = await this.getProjectEntityById(saved.id);
    return this.formatProject(fullProject);
  }

  private validateDates(start?: Date | string, end?: Date | string, deadline?: Date | string) {
    if (!start) return;
    const startDt = new Date(start);
    if (end && new Date(end) <= startDt) {
      throw new BadRequestException('La fecha de fin debe ser posterior a la fecha de inicio');
    }
    if (deadline && new Date(deadline) >= startDt) {
      throw new BadRequestException('La fecha límite de aplicaciones debe ser anterior a la fecha de inicio');
    }
  }

  private validateHours(weeklyHours?: number, totalHours?: number) {
    if (weeklyHours !== undefined && weeklyHours !== null && weeklyHours <= 0) {
      throw new BadRequestException('Las horas semanales deben ser mayores a 0');
    }
    if (totalHours !== undefined && totalHours !== null && totalHours <= 0) {
      throw new BadRequestException('Las horas totales deben ser mayores a 0');
    }
    if (
      weeklyHours !== undefined &&
      weeklyHours !== null &&
      totalHours !== undefined &&
      totalHours !== null &&
      totalHours < weeklyHours
    ) {
      throw new BadRequestException(
        'Las horas totales no pueden ser menores a las horas semanales',
      );
    }
  }

  /** Estados visibles públicamente (sin autenticación) */
  private static readonly PUBLIC_STATUSES = [
    ProjectStatus.PUBLISHED,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.COMPLETED,
  ];

  async getProjectById(
    projectId: string,
    incrementViews = false,
    viewerId?: string,
    viewerRole?: string,
  ): Promise<any> {
    const project = await this.getProjectEntityById(projectId, false);

    const isPublic = ProjectService.PUBLIC_STATUSES.includes(project.status);
    const isOwner = !!viewerId && project.createdByUserId === viewerId;
    const isAdmin = viewerRole === 'admin';

    if (!isPublic && !isOwner && !isAdmin) {
      // No revelar existencia de proyectos no publicados a quien no es dueño/admin
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (incrementViews && isPublic) {
      project.viewsCount += 1;
      await this.projectRepo.save(project);

      this.eventPublisher.publish(
        'project.viewed',
        { projectId, viewsCount: project.viewsCount },
        'project-service',
      ).catch((err) => this.logger.warn(`Error publicando project.viewed: ${err.message}`));
    }

    return this.formatProject(project);
  }

  private async getProjectEntityById(projectId: string, incrementViews = false): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['requirements', 'deliverables', 'skills', 'activities'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (incrementViews) {
      project.viewsCount += 1;
      await this.projectRepo.save(project);

      this.eventPublisher.publish(
        'project.viewed',
        { projectId, viewsCount: project.viewsCount },
        'project-service',
      ).catch((err) => this.logger.warn(`Error publicando project.viewed: ${err.message}`));
    }

    return project;
  }

  async getProjectBySlug(slug: string): Promise<any> {
    const project = await this.projectRepo.findOne({
      where: { slug },
      relations: ['requirements', 'deliverables', 'skills'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return this.formatProject(project);
  }

  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto): Promise<any> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const EDITABLE_STATUSES = [ProjectStatus.DRAFT, ProjectStatus.PUBLISHED, ProjectStatus.NEEDS_CHANGES];
    if (!EDITABLE_STATUSES.includes(project.status)) {
      throw new BadRequestException('Solo se pueden editar proyectos en estado draft, published o needs_changes');
    }

    // El documento de solicitud es la base de la revisión institucional: una vez
    // publicado/aprobado no puede cambiarse por debajo del proceso de revisión.
    // Solo se puede reemplazar mientras la empresa aún está preparando el proyecto
    // (draft) o corrigiéndolo a pedido de Facultad (needs_changes).
    if (
      dto.requestDocumentFileId !== undefined &&
      dto.requestDocumentFileId !== project.requestDocumentFileId &&
      project.status === ProjectStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        'El documento de solicitud solo puede reemplazarse cuando el proyecto está en borrador o requiere cambios',
      );
    }

    this.validateDates(
      dto.startDate || project.startDate,
      dto.endDate || project.endDate,
      dto.applicationDeadline || project.applicationDeadline,
    );

    this.validateHours(
      dto.weeklyHours !== undefined ? dto.weeklyHours : project.weeklyHours,
      dto.totalHours !== undefined ? dto.totalHours : project.totalHours,
    );

    // Procesar habilidades separadamente
    if (dto.skills !== undefined) {
      await this.skillRepo.delete({ projectId });
      if (dto.skills.length > 0) {
        const skills = await this.buildSkillEntities(projectId, dto.skills);
        await this.skillRepo.save(skills);
      }
      delete dto.skills;
      // Prevenir que typeorm intente actualizar skills eliminados
      delete (project as any).skills;
    }

    // Prevenir problemas similares con otras relaciones
    delete (project as any).requirements;
    delete (project as any).deliverables;
    delete (project as any).activities;

    Object.assign(project, dto);
    await this.projectRepo.save(project);

    await this.eventPublisher.publish(
      'project.updated',
      { projectId, companyId: project.companyId },
      'project-service',
    );

    const updated = await this.getProjectEntityById(projectId);
    return this.formatProject(updated);
  }

  async updateProjectStatus(
    projectId: string,
    userId: string,
    dto: UpdateProjectStatusDto,
  ): Promise<any> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    // La empresa NUNCA puede saltarse la revisión institucional: publicar o marcar
    // "needs_changes" es exclusivo del flujo admin (`reviewProject`).
    if (dto.status === ProjectStatus.PUBLISHED || dto.status === ProjectStatus.NEEDS_CHANGES) {
      throw new BadRequestException(
        'Este cambio de estado solo puede realizarlo la Facultad mediante el proceso de revisión',
      );
    }

    const validTransitions = VALID_TRANSITIONS[project.status];
    if (!validTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de '${project.status}' a '${dto.status}'. Transiciones válidas: ${validTransitions.join(', ') || 'ninguna'}`,
      );
    }

    // Validar completitud mínima antes de enviar a revisión
    if (dto.status === ProjectStatus.PENDING_APPROVAL) {
      const skillsCount = await this.skillRepo.count({ where: { projectId } });
      if (skillsCount === 0) {
        throw new BadRequestException(
          'El proyecto debe tener al menos una habilidad requerida antes de enviarse a revisión',
        );
      }
      if (!project.academicPrograms || project.academicPrograms.length === 0) {
        throw new BadRequestException(
          'El proyecto debe tener al menos un programa académico antes de enviarse a revisión',
        );
      }
      if (!project.requestDocumentFileId) {
        throw new BadRequestException(
          'El proyecto debe tener adjunto el documento de solicitud formal antes de enviarse a revisión',
        );
      }
    }

    const previousStatus = project.status;
    project.status = dto.status;

    if (dto.status === ProjectStatus.PENDING_APPROVAL) {
      project.submittedForReviewAt = new Date();
    }

    await this.projectRepo.save(project);

    await this.eventPublisher.publish(
      'project.status.changed',
      {
        projectId,
        companyId: project.companyId,
        previousStatus,
        newStatus: dto.status,
      },
      'project-service',
    );

    if (dto.status === ProjectStatus.PENDING_APPROVAL) {
      await this.eventPublisher.publish(
        'project.submitted_for_review',
        {
          projectId,
          companyId: project.companyId,
          title: project.title,
          submittedAt: project.submittedForReviewAt,
        },
        'project-service',
      );
    }

    this.logger.log(`Estado del proyecto ${projectId} cambiado: ${previousStatus} → ${dto.status}`);
    return this.formatProject(project);
  }

  async deleteProject(projectId: string, userId: string, isAdmin = false): Promise<void> {
    const project = await this.getProjectEntityById(projectId);
    if (!isAdmin) {
      this.verifyOwnership(project, userId);
    }

    await this.projectRepo.remove(project);

    await this.eventPublisher.publish(
      'project.deleted',
      { projectId, companyId: project.companyId },
      'project-service',
    );

    this.logger.log(`Proyecto eliminado: ${projectId}`);
  }

  async searchProjects(query: ProjectSearchQueryDto, studentId?: string): Promise<PaginatedProjectsResponse> {
    const qb = this.projectRepo.createQueryBuilder('project');
    qb.leftJoinAndSelect('project.skills', 'skill');
    qb.leftJoinAndSelect('project.requirements', 'req');
    qb.where('project.isActive = :active', { active: true });

    // Si es estudiante: forzar status=published e ignorar cualquier status query param
    if (studentId) {
      qb.andWhere('project.status = :status', { status: ProjectStatus.PUBLISHED });

      // Excluir proyectos a los que el estudiante ya aplicó
      let appliedProjectIds: string[] = [];
      try {
        appliedProjectIds = await this.httpClient.get<string[]>(
          'application',
          `/internal/applications/student/${studentId}/project-ids`,
        );
      } catch (err) {
        this.logger.warn(`No se pudo obtener proyectos aplicados del estudiante ${studentId}: ${err.message}`);
      }

      if (appliedProjectIds && appliedProjectIds.length > 0) {
        qb.andWhere('project.id NOT IN (:...appliedIds)', { appliedIds: appliedProjectIds });
      }
    } else if (query.status) {
      qb.andWhere('project.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(project.title ILIKE :search OR project.description ILIKE :search OR project.academicPrograms ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.projectType) {
      qb.andWhere('project.projectType = :projectType', { projectType: query.projectType });
    }

    if (query.locationType) {
      qb.andWhere('project.locationType = :locationType', { locationType: query.locationType });
    }

    if (query.academicProgram) {
      qb.andWhere('project.academicPrograms ILIKE :program', {
        program: `%${query.academicProgram}%`,
      });
    }

    if (query.skill) {
      qb.andWhere('skill.name = :skill', { skill: query.skill.toLowerCase() });
    }

    if (query.companyId) {
      qb.andWhere('project.companyId = :companyId', { companyId: query.companyId });
    }

    if (query.minimumSemester) {
      qb.andWhere(
        '(project.minimumSemester IS NULL OR project.minimumSemester <= :semester)',
        { semester: query.minimumSemester },
      );
    }

    // Ordenamiento
    const sortMap: Record<string, string> = {
      createdAt: 'project.createdAt',
      deadline: 'project.applicationDeadline',
      views: 'project.viewsCount',
      applications: 'project.applicationsCount',
    };
    const sortBy = sortMap[query.sortBy || 'createdAt'] || 'project.createdAt';
    const sortOrder = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortBy, sortOrder);

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((p) => this.formatProject(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyProjects(userId: string, query?: ProjectSearchQueryDto): Promise<PaginatedProjectsResponse> {
    const qb = this.projectRepo.createQueryBuilder('project');
    qb.leftJoinAndSelect('project.skills', 'skill');
    qb.where('project.createdByUserId = :userId', { userId });

    if (query?.status) {
      qb.andWhere('project.status = :status', { status: query.status });
    }

    qb.orderBy('project.createdAt', 'DESC');

    const page = query?.page || 1;
    const limit = query?.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((p) => this.formatProject(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMyProjectsStats(userId: string) {
    const projects = await this.projectRepo.find({
      where: { createdByUserId: userId },
    });

    const stats = {
      total: projects.length,
      draft: 0,
      published: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalViews: 0,
      totalApplications: 0,
    };

    for (const p of projects) {
      if (p.status === ProjectStatus.DRAFT) stats.draft++;
      else if (p.status === ProjectStatus.PUBLISHED) stats.published++;
      else if (p.status === ProjectStatus.IN_PROGRESS) stats.inProgress++;
      else if (p.status === ProjectStatus.COMPLETED) stats.completed++;
      else if (p.status === ProjectStatus.CANCELLED) stats.cancelled++;
      stats.totalViews += p.viewsCount;
      stats.totalApplications += p.applicationsCount;
    }

    return stats;
  }

  // ── REQUISITOS ──

  async getRequirements(projectId: string): Promise<ProjectRequirement[]> {
    await this.getProjectEntityById(projectId); // verifica existencia
    return this.requirementRepo.find({
      where: { projectId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async addRequirement(
    projectId: string,
    userId: string,
    dto: AddProjectRequirementDto,
  ): Promise<ProjectRequirement> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const requirement = this.requirementRepo.create({ ...dto, projectId });
    return this.requirementRepo.save(requirement);
  }

  async updateRequirement(
    projectId: string,
    requirementId: string,
    userId: string,
    dto: Partial<AddProjectRequirementDto>,
  ): Promise<ProjectRequirement> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const requirement = await this.requirementRepo.findOne({
      where: { id: requirementId, projectId },
    });
    if (!requirement) {
      throw new NotFoundException('Requisito no encontrado');
    }

    Object.assign(requirement, dto);
    return this.requirementRepo.save(requirement);
  }

  async deleteRequirement(projectId: string, requirementId: string, userId: string): Promise<void> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const requirement = await this.requirementRepo.findOne({
      where: { id: requirementId, projectId },
    });
    if (!requirement) {
      throw new NotFoundException('Requisito no encontrado');
    }

    await this.requirementRepo.remove(requirement);
  }

  // ── ARCHIVOS ──

  /**
   * Resuelve si un usuario puede descargar el documento de solicitud de un proyecto.
   *
   * Storage Service delega aquí cuando el solicitante no es el dueño del archivo.
   * El documento se sube antes de que exista ninguna aplicación, así que no se
   * puede resolver vía application-service; se busca directamente el proyecto
   * que referencia ese `requestDocumentFileId`.
   */
  async canAccessRequestDocument(
    fileId: string,
    userRole: string | null,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const project = await this.projectRepo.findOne({ where: { requestDocumentFileId: fileId } });
    if (!project) {
      return { allowed: false, reason: 'file_not_linked_to_project' };
    }
    if (userRole === 'admin' || userRole === 'faculty') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'role_not_authorized' };
  }

  // ── ENTREGABLES ──

  async getDeliverables(projectId: string): Promise<ProjectDeliverable[]> {
    await this.getProjectEntityById(projectId);
    return this.deliverableRepo.find({
      where: { projectId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async addDeliverable(
    projectId: string,
    userId: string,
    dto: AddProjectDeliverableDto,
  ): Promise<ProjectDeliverable> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const deliverable = this.deliverableRepo.create({ ...dto, projectId });
    return this.deliverableRepo.save(deliverable);
  }

  async updateDeliverable(
    projectId: string,
    deliverableId: string,
    userId: string,
    dto: Partial<AddProjectDeliverableDto>,
  ): Promise<ProjectDeliverable> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const deliverable = await this.deliverableRepo.findOne({
      where: { id: deliverableId, projectId },
    });
    if (!deliverable) {
      throw new NotFoundException('Entregable no encontrado');
    }

    Object.assign(deliverable, dto);
    return this.deliverableRepo.save(deliverable);
  }

  async deleteDeliverable(projectId: string, deliverableId: string, userId: string): Promise<void> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const deliverable = await this.deliverableRepo.findOne({
      where: { id: deliverableId, projectId },
    });
    if (!deliverable) {
      throw new NotFoundException('Entregable no encontrado');
    }

    await this.deliverableRepo.remove(deliverable);
  }

  // ── HABILIDADES ──

  async getSkills(projectId: string): Promise<ProjectSkill[]> {
    await this.getProjectEntityById(projectId);
    return this.skillRepo.find({
      where: { projectId },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async addSkill(projectId: string, userId: string, dto: CreateProjectSkillDto): Promise<ProjectSkill> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const [skill] = await this.buildSkillEntities(projectId, [dto]);
    return this.skillRepo.save(skill);
  }

  async updateSkill(
    projectId: string,
    skillId: string,
    userId: string,
    dto: UpdateProjectSkillDto,
  ): Promise<ProjectSkill> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const skill = await this.skillRepo.findOne({ where: { id: skillId, projectId } });
    if (!skill) {
      throw new NotFoundException('Habilidad no encontrada');
    }

    if (dto.name && dto.name !== skill.name && !dto.catalogSkillId) {
      const resolved = await this.resolveCatalogSkillIds([dto.name]);
      skill.catalogSkillId = resolved.get(dto.name) ?? null;
    }
    Object.assign(skill, dto);
    return this.skillRepo.save(skill);
  }

  async deleteSkill(projectId: string, skillId: string, userId: string): Promise<void> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const skill = await this.skillRepo.findOne({ where: { id: skillId, projectId } });
    if (!skill) {
      throw new NotFoundException('Habilidad no encontrada');
    }

    await this.skillRepo.remove(skill);
  }

  // ── ACTIVIDADES ──

  async getActivities(projectId: string): Promise<ProjectActivity[]> {
    await this.getProjectEntityById(projectId);
    return this.activityRepo.find({
      where: { projectId },
      order: { dueDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async createActivity(
    projectId: string,
    userId: string,
    dto: CreateActivityDto,
  ): Promise<ProjectActivity> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const activity = this.activityRepo.create({
      projectId,
      assignedBy: userId,
      title: dto.title,
      description: dto.description,
      activityType: dto.activityType,
      studentId: dto.studentId,
      scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      priority: dto.priority,
      hoursEstimated: dto.hoursEstimated,
    });

    return this.activityRepo.save(activity);
  }

  async updateActivity(
    projectId: string,
    activityId: string,
    dto: UpdateActivityDto,
  ): Promise<ProjectActivity> {
    await this.getProjectEntityById(projectId);

    const activity = await this.activityRepo.findOne({
      where: { id: activityId, projectId },
    });
    if (!activity) {
      throw new NotFoundException('Actividad no encontrada');
    }

    Object.assign(activity, dto);
    return this.activityRepo.save(activity);
  }

  // ── INTER-SERVICIO ──

  async getMatchingData(projectId: string) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['requirements', 'skills'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return {
      projectId: project.id,
      title: project.title,
      projectType: project.projectType,
      academicPrograms: project.academicPrograms,
      minimumSemester: project.minimumSemester,
      locationType: project.locationType,
      requirements: (project.requirements || []).map((r) => ({
        type: r.requirementType,
        name: r.name,
        isMandatory: r.isMandatory,
        proficiencyLevel: r.proficiencyLevel,
      })),
      skills: (project.skills || []).map((s) => ({
        name: s.name,
        catalogSkillId: s.catalogSkillId,
        category: s.category,
        proficiencyLevel: s.proficiencyLevel,
        isMandatory: s.isMandatory,
      })),
    };
  }

  async getProjectsBatch(projectIds: string[]): Promise<
    { id: string; title: string; companyId: string; createdByUserId: string }[]
  > {
    if (!projectIds.length) return [];
    const projects = await this.projectRepo.find({ where: { id: In(projectIds) } });
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      companyId: p.companyId,
      createdByUserId: p.createdByUserId,
    }));
  }

  async startProject(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException(`Proyecto ${projectId} no encontrado`);

    if (project.status !== ProjectStatus.PUBLISHED) {
      this.logger.warn(`Proyecto ${projectId} en estado "${project.status}", no se puede iniciar via asignación`);
      return;
    }

    project.status = ProjectStatus.IN_PROGRESS;
    await this.projectRepo.save(project);

    await this.eventPublisher.publish('project.started', {
      projectId,
      companyId: project.companyId,
    }, 'project-service');

    this.logger.log(`Proyecto ${projectId} iniciado por asignación de supervisor`);
  }

  async projectExists(projectId: string): Promise<{
    exists: boolean;
    companyId: string | null;
    title: string | null;
    status: string | null;
    minimumSemester: number | null;
    academicPrograms: string[] | null;
    skills: { name: string; catalogSkillId: string | null; category: string; proficiencyLevel: string | null; isMandatory: boolean }[];
  }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId }, relations: ['skills'] });
    if (!project) {
      return {
        exists: false, companyId: null, title: null, status: null, minimumSemester: null,
        academicPrograms: null, skills: [],
      };
    }
    return {
      exists: true,
      companyId: project.companyId,
      title: project.title,
      status: project.status,
      minimumSemester: project.minimumSemester ?? null,
      academicPrograms: project.academicPrograms ?? null,
      skills: (project.skills || []).map((s) => ({
        name: s.name,
        catalogSkillId: s.catalogSkillId,
        category: s.category,
        proficiencyLevel: s.proficiencyLevel,
        isMandatory: s.isMandatory,
      })),
    };
  }

  async incrementApplications(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    project.applicationsCount += 1;
    await this.projectRepo.save(project);
  }

  // ── UTILIDADES ──

  async getProjectIdsByCompany(companyId: string): Promise<string[]> {
    const projects = await this.projectRepo.find({
      where: { companyId },
      select: ['id'],
    });
    return projects.map((p) => p.id);
  }

  private verifyOwnership(project: Project, userId: string): void {
    if (project.createdByUserId !== userId) {
      throw new ForbiddenException('No tienes permisos para modificar este proyecto');
    }
  }

  // ── ADMIN ──

  async getAdminPendingProjects(query: { page?: number; limit?: number; search?: string }) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

    const qb = this.projectRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.skills', 'skill')
      .where('p.status = :status', { status: ProjectStatus.PENDING_APPROVAL })
      .orderBy('p.createdAt', 'ASC'); // los más antiguos primero

    if (query.search) {
      qb.andWhere('(p.title ILIKE :s OR p.description ILIKE :s)', { s: `%${query.search}%` });
    }

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      data: data.map((p) => this.formatProject(p)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async reviewProject(
    projectId: string,
    reviewerId: string,
    action: 'approve' | 'needs_changes' | 'reject',
    options: {
      notes?: string;
      categories?: string[];
    } = {},
  ) {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.status !== ProjectStatus.PENDING_APPROVAL) {
      throw new BadRequestException('El proyecto no está pendiente de aprobación');
    }

    if (action === 'reject' && (!options.categories || options.categories.length === 0)) {
      throw new BadRequestException('Debes seleccionar al menos una categoría de rechazo');
    }
    if (action === 'needs_changes' && !options.notes) {
      throw new BadRequestException('Debes indicar qué cambios se requieren');
    }

    const newStatus =
      action === 'approve'
        ? ProjectStatus.PUBLISHED
        : action === 'needs_changes'
          ? ProjectStatus.NEEDS_CHANGES
          : ProjectStatus.DRAFT;

    const previousStatus = project.status;
    project.status = newStatus;
    project.facultyReviewerId = reviewerId;
    project.facultyReviewedAt = new Date();
    project.facultyReviewNotes = options.notes ?? null;
    project.facultyRejectionCategories = action === 'reject' ? (options.categories ?? null) : null;

    await this.projectRepo.save(project);

    await this.eventPublisher.publish('project.status.changed', {
      projectId,
      companyId: project.companyId,
      previousStatus,
      newStatus,
      reason: options.notes,
    }, 'project-service');

    if (action === 'approve') {
      const requirements = await this.requirementRepo.find({ where: { projectId } });
      await this.eventPublisher.publish('project.published', {
        projectId,
        companyId:    project.companyId,
        title:        project.title,
        requirements: requirements.map((r) => ({
          type:        r.requirementType,
          name:        r.name,
          isMandatory: r.isMandatory,
        })),
      }, 'project-service');

      await this.eventPublisher.publish('project.faculty_approved', {
        projectId,
        companyId: project.companyId,
        title: project.title,
      }, 'project-service');
    } else if (action === 'needs_changes') {
      await this.eventPublisher.publish('project.needs_changes', {
        projectId,
        companyId: project.companyId,
        title: project.title,
        notes: options.notes,
      }, 'project-service');
    } else {
      await this.eventPublisher.publish('project.faculty_rejected', {
        projectId,
        companyId: project.companyId,
        title: project.title,
        categories: options.categories,
        notes: options.notes,
      }, 'project-service');
    }

    this.logger.log(`Proyecto ${projectId} → ${action} por admin ${reviewerId}`);
    return this.formatProject(project);
  }
}


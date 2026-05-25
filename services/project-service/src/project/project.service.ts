import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventPublisher, MicroserviceHttpClient } from '@collab-u/shared';

import { Project, ProjectStatus } from './entities/project.entity';
import { ProjectRequirement } from './entities/project-requirement.entity';
import { ProjectDeliverable } from './entities/project-deliverable.entity';
import { ProjectTag } from './entities/project-tag.entity';
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
  [ProjectStatus.DRAFT]: [ProjectStatus.PUBLISHED, ProjectStatus.CANCELLED],
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
    @InjectRepository(ProjectTag) private tagRepo: Repository<ProjectTag>,
    @InjectRepository(ProjectActivity) private activityRepo: Repository<ProjectActivity>,
    private readonly eventPublisher: EventPublisher,
    private readonly httpClient: MicroserviceHttpClient,
  ) {}

  /**
   * Formatea un proyecto para la respuesta de la API, 
   * convirtiendo la relación de tags en un array de strings.
   */
  private formatProject(project: Project): any {
    if (!project) return null;
    return {
      ...project,
      tags: project.tags?.map((t: any) => (typeof t === 'string' ? t : t.tag)) || [],
    };
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

    const project = this.projectRepo.create({
      companyId,
      createdByUserId: userId,
      title: dto.title,
      description: dto.description,
      shortDescription: dto.shortDescription,
      projectType: dto.projectType,
      durationMonths: dto.durationMonths,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      locationType: dto.locationType,
      location: dto.location,
      compensationType: dto.compensationType,
      compensationAmount: dto.compensationAmount,
      positionsAvailable: dto.positionsAvailable,
      applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : undefined,
      academicPrograms: dto.academicPrograms,
      minimumSemester: dto.minimumSemester,
    });

    const saved = await this.projectRepo.save(project);

    // Crear tags si se proporcionaron
    if (dto.tags && dto.tags.length > 0) {
      const tags = dto.tags.map((tag) =>
        this.tagRepo.create({ projectId: saved.id, tag: tag.toLowerCase().trim() }),
      );
      await this.tagRepo.save(tags);
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

  async getProjectById(projectId: string, incrementViews = false): Promise<any> {
    const project = await this.getProjectEntityById(projectId, incrementViews);
    return this.formatProject(project);
  }

  private async getProjectEntityById(projectId: string, incrementViews = false): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['requirements', 'deliverables', 'tags', 'activities'],
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
      relations: ['requirements', 'deliverables', 'tags'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return this.formatProject(project);
  }

  async updateProject(projectId: string, userId: string, dto: UpdateProjectDto): Promise<any> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.PUBLISHED) {
      throw new BadRequestException('Solo se pueden editar proyectos en estado draft o published');
    }

    this.validateDates(
      dto.startDate || project.startDate,
      dto.endDate || project.endDate,
      dto.applicationDeadline || project.applicationDeadline,
    );

    // Procesar tags separadamente
    if (dto.tags !== undefined) {
      await this.tagRepo.delete({ projectId });
      if (dto.tags.length > 0) {
        const tags = dto.tags.map((tag) =>
          this.tagRepo.create({ projectId, tag: tag.toLowerCase().trim() }),
        );
        await this.tagRepo.save(tags);
      }
      delete dto.tags;
      // Prevenir que typeorm intente actualizar tags eliminados
      delete (project as any).tags;
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

    const validTransitions = VALID_TRANSITIONS[project.status];
    if (!validTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `No se puede cambiar de '${project.status}' a '${dto.status}'. Transiciones válidas: ${validTransitions.join(', ') || 'ninguna'}`,
      );
    }

    // Validar que tenga al menos 1 requirement antes de publicar
    if (dto.status === ProjectStatus.PUBLISHED) {
      const requirements = await this.requirementRepo.find({ where: { projectId } });
      if (requirements.length === 0) {
        throw new BadRequestException(
          'El proyecto debe tener al menos un requisito antes de ser publicado',
        );
      }
    }

    const previousStatus = project.status;
    project.status = dto.status;
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

    // Publicar evento especial cuando se publica (para trigger batch matching)
    if (dto.status === ProjectStatus.PUBLISHED) {
      const requirements = await this.requirementRepo.find({ where: { projectId } });
      await this.eventPublisher.publish(
        'project.published',
        {
          projectId,
          companyId: project.companyId,
          title: project.title,
          requirements: requirements.map((r) => ({
            type: r.requirementType,
            name: r.name,
            isMandatory: r.isMandatory,
          })),
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
    qb.leftJoinAndSelect('project.tags', 'tag');
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

    if (query.tag) {
      qb.andWhere('tag.tag = :tag', { tag: query.tag.toLowerCase() });
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
    qb.leftJoinAndSelect('project.tags', 'tag');
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

  // ── TAGS ──

  async addTags(projectId: string, userId: string, tags: string[]): Promise<ProjectTag[]> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const newTags: ProjectTag[] = [];
    for (const tagStr of tags) {
      const normalized = tagStr.toLowerCase().trim();
      const existing = await this.tagRepo.findOne({ where: { projectId, tag: normalized } });
      if (!existing) {
        const tag = this.tagRepo.create({ projectId, tag: normalized });
        newTags.push(await this.tagRepo.save(tag));
      }
    }
    return newTags;
  }

  async deleteTag(projectId: string, tagId: string, userId: string): Promise<void> {
    const project = await this.getProjectEntityById(projectId);
    this.verifyOwnership(project, userId);

    const tag = await this.tagRepo.findOne({ where: { id: tagId, projectId } });
    if (!tag) {
      throw new NotFoundException('Tag no encontrado');
    }

    await this.tagRepo.remove(tag);
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
      relations: ['requirements'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return {
      projectId: project.id,
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
    };
  }

  async projectExists(projectId: string): Promise<{ exists: boolean; companyId: string | null; status: string | null }> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) {
      return { exists: false, companyId: null, status: null };
    }
    return { exists: true, companyId: project.companyId, status: project.status };
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
}


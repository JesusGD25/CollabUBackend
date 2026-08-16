import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@collab-u/shared';

import { ProjectService } from './project.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  UpdateProjectStatusDto,
  AddProjectRequirementDto,
  UpdateRequirementDto,
  AddProjectDeliverableDto,
  UpdateDeliverableDto,
  CreateProjectSkillDto,
  UpdateProjectSkillDto,
  ProjectSearchQueryDto,
  CreateActivityDto,
  UpdateActivityDto,
} from './dto';

@ApiTags('Projects')
@Controller('api/v1/projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // ── PROYECTOS ──

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear proyecto' })
  @ApiResponse({ status: 201, description: 'Proyecto creado exitosamente' })
  async createProject(@CurrentUser() user: any, @Body() dto: CreateProjectDto) {
    return this.projectService.createProject(user.userId, user.companyId || user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar/buscar proyectos' })
  @ApiResponse({ status: 200, description: 'Listado de proyectos' })
  async searchProjects(@CurrentUser() user: any, @Query() query: ProjectSearchQueryDto) {
    const studentId = user?.role === UserRole.STUDENT ? user.userId : undefined;
    return this.projectService.searchProjects(query, studentId);
  }

  @Get('my-projects')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mis proyectos publicados' })
  @ApiResponse({ status: 200, description: 'Listado de mis proyectos' })
  async getMyProjects(@CurrentUser() user: any, @Query() query: ProjectSearchQueryDto) {
    return this.projectService.getMyProjects(user.userId, query);
  }

  @Get('my-projects/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Estadísticas de mis proyectos' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getMyProjectsStats(@CurrentUser() user: any) {
    return this.projectService.getMyProjectsStats(user.userId);
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener proyecto por slug' })
  @ApiParam({ name: 'slug', type: 'string' })
  @ApiResponse({ status: 200, description: 'Proyecto obtenido' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getProjectBySlug(@Param('slug') slug: string) {
    return this.projectService.getProjectBySlug(slug);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Obtener proyecto por ID (público si está publicado; borradores solo visibles para su dueño o admin)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Proyecto obtenido' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getProject(
    @CurrentUser() user: any,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.projectService.getProjectById(projectId, true, user?.id, user?.role);
  }

  @Patch(':projectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Proyecto actualizado' })
  async updateProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(projectId, user.userId, dto);
  }

  @Patch(':projectId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar estado del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  async updateProjectStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectService.updateProjectStatus(projectId, user.userId, dto);
  }

  @Delete(':projectId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Proyecto eliminado' })
  async deleteProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    await this.projectService.deleteProject(projectId, user.userId, isAdmin);
  }

  // ── REQUISITOS ──

  @Get(':projectId/requirements')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar requisitos del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  async getRequirements(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.getRequirements(projectId);
  }

  @Post(':projectId/requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar requisito al proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Requisito agregado' })
  async addRequirement(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: AddProjectRequirementDto,
  ) {
    return this.projectService.addRequirement(projectId, user.userId, dto);
  }

  @Patch(':projectId/requirements/:reqId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar requisito' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reqId', type: 'string', format: 'uuid' })
  async updateRequirement(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.projectService.updateRequirement(projectId, reqId, user.userId, dto);
  }

  @Delete(':projectId/requirements/:reqId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar requisito' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'reqId', type: 'string', format: 'uuid' })
  async deleteRequirement(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('reqId', ParseUUIDPipe) reqId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectService.deleteRequirement(projectId, reqId, user.userId);
  }

  // ── ENTREGABLES ──

  @Get(':projectId/deliverables')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar entregables del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  async getDeliverables(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.getDeliverables(projectId);
  }

  @Post(':projectId/deliverables')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar entregable al proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Entregable agregado' })
  async addDeliverable(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: AddProjectDeliverableDto,
  ) {
    return this.projectService.addDeliverable(projectId, user.userId, dto);
  }

  @Patch(':projectId/deliverables/:delId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar entregable' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'delId', type: 'string', format: 'uuid' })
  async updateDeliverable(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('delId', ParseUUIDPipe) delId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateDeliverableDto,
  ) {
    return this.projectService.updateDeliverable(projectId, delId, user.userId, dto);
  }

  @Delete(':projectId/deliverables/:delId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar entregable' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'delId', type: 'string', format: 'uuid' })
  async deleteDeliverable(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('delId', ParseUUIDPipe) delId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectService.deleteDeliverable(projectId, delId, user.userId);
  }

  // ── HABILIDADES ──

  @Get(':projectId/skills')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar habilidades requeridas del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  async getSkills(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.getSkills(projectId);
  }

  @Post(':projectId/skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar habilidad requerida al proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Habilidad agregada' })
  async addSkill(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateProjectSkillDto,
  ) {
    return this.projectService.addSkill(projectId, user.userId, dto);
  }

  @Patch(':projectId/skills/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar habilidad requerida del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'skillId', type: 'string', format: 'uuid' })
  async updateSkill(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateProjectSkillDto,
  ) {
    return this.projectService.updateSkill(projectId, skillId, user.userId, dto);
  }

  @Delete(':projectId/skills/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar habilidad requerida del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'skillId', type: 'string', format: 'uuid' })
  async deleteSkill(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @CurrentUser() user: any,
  ) {
    await this.projectService.deleteSkill(projectId, skillId, user.userId);
  }

  // ── ACTIVIDADES ──

  @Get(':projectId/activities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar actividades del proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  async getActivities(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.getActivities(projectId);
  }

  @Post(':projectId/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear actividad en el proyecto' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Actividad creada' })
  async createActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateActivityDto,
  ) {
    return this.projectService.createActivity(projectId, user.userId, dto);
  }

  @Patch(':projectId/activities/:actId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar actividad' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'actId', type: 'string', format: 'uuid' })
  async updateActivity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('actId', ParseUUIDPipe) actId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.projectService.updateActivity(projectId, actId, dto);
  }

  // ── ADMIN ──

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar proyectos pendientes de aprobación (solo admin)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de proyectos pendientes' })
  async getAdminPendingProjects(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('search') search?: string,
  ) {
    return this.projectService.getAdminPendingProjects({ page: Number(page), limit: Number(limit), search });
  }

  @Patch('admin/:projectId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aprobar, rechazar o solicitar cambios a un proyecto (solo admin)' })
  @ApiResponse({ status: 200, description: 'Proyecto revisado' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async reviewProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      action: 'approve' | 'needs_changes' | 'reject';
      notes?: string;
      categories?: string[];
    },
  ) {
    return this.projectService.reviewProject(projectId, user.userId, body.action, {
      notes: body.notes,
      categories: body.categories,
    });
  }
}

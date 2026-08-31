import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { ProjectService } from './project.service';

@ApiTags('Projects Internal')
@Controller('internal/projects')
export class ProjectInternalController {
  constructor(private readonly projectService: ProjectService) {}

  @Get(':projectId/matching-data')
  @ApiOperation({ summary: 'Obtener datos para matching (uso interno)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Datos de matching obtenidos' })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async getMatchingData(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.getMatchingData(projectId);
  }

  @Get(':projectId/exists')
  @ApiOperation({ summary: 'Verificar si existe el proyecto (uso interno)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resultado de existencia' })
  async exists(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.projectExists(projectId);
  }

  @Patch(':projectId/increment-applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Incrementar contador de postulaciones (uso interno)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Contador incrementado' })
  async incrementApplications(@Param('projectId', ParseUUIDPipe) projectId: string) {
    await this.projectService.incrementApplications(projectId);
    return { message: 'Contador de postulaciones incrementado' };
  }

  @Get('company/:companyId')
  @ApiOperation({ summary: 'Obtener IDs de proyectos de una empresa (uso interno)' })
  @ApiParam({ name: 'companyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'IDs de proyectos obtenidos' })
  async getProjectIdsByCompany(@Param('companyId', ParseUUIDPipe) companyId: string) {
    return this.projectService.getProjectIdsByCompany(companyId);
  }

  @Post('batch-basic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener info básica de múltiples proyectos (uso interno)' })
  @ApiResponse({ status: 200, description: 'Info básica de proyectos' })
  async getProjectsBatch(@Body() body: { projectIds: string[] }) {
    return this.projectService.getProjectsBatch(body.projectIds);
  }

  @Patch(':projectId/start-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar proyecto tras asignación de supervisor (uso interno)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Proyecto iniciado' })
  async startProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    await this.projectService.startProject(projectId);
    return { message: 'Proyecto iniciado correctamente' };
  }

  @Get(':projectId/deliverables')
  @ApiOperation({ summary: 'Obtener plantillas de entregables de un proyecto (uso interno)' })
  @ApiParam({ name: 'projectId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Entregables del proyecto' })
  async getProjectDeliverables(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.projectService.getDeliverables(projectId);
  }

  /**
   * Autoriza el acceso al documento de solicitud de un proyecto.
   *
   * Storage Service delega aquí en cada descarga que no sea del propietario.
   * El documento se sube antes de que exista ninguna aplicación, así que no
   * puede resolverse por ese lado; se busca directamente por `requestDocumentFileId`.
   */
  @Post('files/can-access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar acceso al documento de solicitud de un proyecto (uso interno)' })
  async canAccessFile(
    @Body() body: { userId: string; userRole: string; fileId: string },
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.projectService.canAccessRequestDocument(body.fileId, body.userRole);
  }
}

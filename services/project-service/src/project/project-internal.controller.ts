import {
  Controller,
  Get,
  Patch,
  Param,
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
}

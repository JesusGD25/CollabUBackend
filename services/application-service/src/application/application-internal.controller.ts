import { Controller, Get, Post, Patch, Param, ParseUUIDPipe, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { ApplicationQueryDto } from './dto';

/** Rutas de uso interno entre microservicios — sin autenticación JWT */
@ApiExcludeController()
@Controller('internal/applications')
export class ApplicationInternalController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get('project/:projectId/count')
  async countByProject(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const count = await this.applicationService.countByProject(projectId);
    return { projectId, count };
  }

  @Get('student/:studentId/active-count')
  async countActiveByStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    const count = await this.applicationService.countActiveByStudent(studentId);
    return { studentId, count };
  }

  @Get('student/:studentId/project-ids')
  async getAppliedProjectIds(@Param('studentId', ParseUUIDPipe) studentId: string) {
    const projectIds = await this.applicationService.getAppliedProjectIds(studentId);
    return projectIds;
  }

  @Get('project/:projectId')
  getProjectApplications(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applicationService.getProjectApplications(projectId, 'internal', query);
  }

  @Post('student/:studentId/withdraw-all')
  async withdrawAllByStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    await this.applicationService.withdrawAllByStudent(studentId);
    return { message: `Postulaciones retiradas para el estudiante ${studentId}` };
  }

  @Patch(':id/start-progress')
  @HttpCode(HttpStatus.OK)
  async startInProgress(@Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.startInProgress(id);
    return { message: 'Postulación iniciada correctamente' };
  }
}

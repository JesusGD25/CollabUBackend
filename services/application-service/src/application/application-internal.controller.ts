import { Controller, Get, Post, Patch, Param, Body, ParseUUIDPipe, Query, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Patch(':id/pending-supervisor')
  @HttpCode(HttpStatus.OK)
  async markPendingSupervisor(@Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.markPendingSupervisor(id);
    return { message: 'Postulación marcada como pendiente de asesor' };
  }

  @Patch(':id/revert-accepted')
  @HttpCode(HttpStatus.OK)
  async revertToAccepted(@Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.revertToAccepted(id);
    return { message: 'Postulación revertida a accepted' };
  }

  @Patch(':id/start-progress')
  @HttpCode(HttpStatus.OK)
  async startInProgress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { supervisorAssignmentId?: string },
  ) {
    await this.applicationService.startInProgress(id, body?.supervisorAssignmentId);
    return { message: 'Postulación iniciada correctamente' };
  }

  @Get('academic-records/stats')
  getAcademicRecordStats() {
    return this.applicationService.getAcademicRecordStats();
  }

  @Get(':id/academic-record-status')
  async getAcademicRecordStatus(@Param('id', ParseUUIDPipe) id: string) {
    try {
      const record = await this.applicationService.getAcademicRecord(id);
      return { status: record.status };
    } catch {
      return { status: null };
    }
  }

  @Get(':id/enriched')
  async getEnrichedApplication(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.findEnrichedById(id);
  }

  /**
   * Autoriza el acceso a un archivo cuyo propietario NO es quien lo pide.
   *
   * Storage Service delega aquí en cada descarga que no sea del propietario.
   * La búsqueda se hace por `fileId` y no por `entityType`, porque las subidas
   * reales del frontend no rellenan ese campo — solo el seed lo hace.
   *
   * Sin esta delegación, un jurado no podía descargar el anteproyecto que debía
   * revisar, ni un asesor los entregables que debía calificar.
   */
  @Post('files/can-access')
  @HttpCode(HttpStatus.OK)
  async canAccessFile(
    @Body() body: { userId: string; userRole: string; fileId: string },
  ): Promise<{ allowed: boolean; reason?: string }> {
    return this.applicationService.canAccessFile(body.fileId, {
      id: body.userId,
      role: body.userRole,
    });
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@collab-u/shared';

import { ApplicationService } from './application.service';
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
import { DeliverableStatus } from './entities/student-deliverable.entity';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  // ──────────────────────────────────────────────────────────────────
  // POSTULACIONES
  // ──────────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Postularse a un proyecto' })
  @ApiResponse({ status: 201, description: 'Postulación creada' })
  @ApiResponse({ status: 409, description: 'Ya existe una postulación para este proyecto' })
  create(@CurrentUser() user: any, @Body() dto: CreateApplicationDto) {
    return this.applicationService.createApplication(user.id, dto);
  }

  @Get('admin/pending')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar postulaciones aceptadas pendientes de asignar supervisor' })
  getAdminPending(@Query() query: ApplicationQueryDto) {
    return this.applicationService.getAdminPendingApplications(query);
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Ver mis postulaciones' })
  getMyApplications(@CurrentUser() user: any, @Query() query: ApplicationQueryDto) {
    return this.applicationService.getMyApplications(user.id, query);
  }

  @Get('received')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver postulaciones recibidas (empresa)' })
  getReceivedApplications(@CurrentUser() user: any, @Query() query: ApplicationQueryDto) {
    return this.applicationService.getReceivedApplications(user.companyId || user.userId || user.id, query);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver detalle de una postulación' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.findApplicationById(id);
  }

  @Get(':id/timeline')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver historial de cambios de estado' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.getApplicationTimeline(id);
  }

  @Get('project/:projectId')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver todas las postulaciones de un proyecto' })
  getByProject(
    @CurrentUser() user: any,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applicationService.getProjectApplications(projectId, user.id, query);
  }

  @Patch(':id/status')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de una postulación (empresa)' })
  updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationService.updateStatus(id, user.id, dto);
  }

  @Patch(':id/withdraw')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Retirar una postulación (estudiante)' })
  withdraw(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    return this.applicationService.withdraw(id, user.id, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // ENTREVISTAS
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/interviews')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Programar una entrevista' })
  scheduleInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.applicationService.scheduleInterview(id, user.id, dto);
  }

  @Get(':id/interviews')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver entrevistas de una postulación' })
  getInterviews(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.getInterviews(id);
  }

  @Patch(':id/interviews/:interviewId/complete')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marcar entrevista como completada' })
  completeInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: CompleteInterviewDto,
  ) {
    return this.applicationService.completeInterview(id, interviewId, user.id, dto);
  }

  @Patch(':id/interviews/:interviewId/cancel')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancelar una entrevista' })
  cancelInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: CancelInterviewDto,
  ) {
    return this.applicationService.cancelInterview(id, interviewId, user.id, dto);
  }

  @Post(':id/interviews/:interviewId/reschedule')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reagendar una entrevista' })
  rescheduleInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: RescheduleInterviewDto,
  ) {
    return this.applicationService.rescheduleInterview(id, interviewId, user.id, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // ENTREGABLES
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/deliverables')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Enviar un entregable' })
  submitDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    console.log('[submitDeliverable] raw dto:', JSON.stringify(dto));
    return this.applicationService.submitDeliverable(id, user.id, dto);
  }

  @Patch(':id/deliverables/:deliverableId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Actualizar un entregable (revisión)' })
  updateDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    return this.applicationService.updateDeliverable(id, deliverableId, user.id, dto);
  }

  @Get(':id/deliverables')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver entregables de una postulación' })
  getDeliverables(@Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.getDeliverables(id);
  }

  @Patch(':id/deliverables/:deliverableId/approve')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Aprobar un entregable' })
  approveDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    return this.applicationService.reviewDeliverable(
      id,
      deliverableId,
      user.id,
      DeliverableStatus.APPROVED,
      dto,
    );
  }

  @Patch(':id/deliverables/:deliverableId/reject')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Rechazar un entregable' })
  rejectDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    return this.applicationService.reviewDeliverable(
      id,
      deliverableId,
      user.id,
      DeliverableStatus.REJECTED,
      dto,
    );
  }

  @Patch(':id/deliverables/:deliverableId/request-revision')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Solicitar revisión de un entregable' })
  requestRevision(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    return this.applicationService.reviewDeliverable(
      id,
      deliverableId,
      user.id,
      DeliverableStatus.NEEDS_REVISION,
      dto,
    );
  }

  @Post(':id/deliverables/create')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear y asignar un entregable a una postulación' })
  createDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.applicationService.createDeliverable(id, user.id, dto);
  }

  @Post('deliverables/bulk-create')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear el mismo entregable para múltiples postulaciones' })
  bulkCreateDeliverable(
    @CurrentUser() user: any,
    @Body() dto: BulkCreateDeliverableDto,
  ) {
    return this.applicationService.bulkCreateDeliverable(user.id, dto);
  }
}

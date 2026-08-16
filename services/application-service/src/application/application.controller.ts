import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
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
  RequestSelectionDocumentDto,
  SubmitSelectionDocumentDto,
  ReviewSelectionDocumentDto,
  SubmitAnteproyectoDto,
  AsesorCommentDto,
  ReviewAnteproyectoDto,
  CreateDeliverableCommentDto,
  UploadInitiationAgreementDto,
  UploadFinalGradeDto,
  CancelFinalizationDto,
  StartFinalizationDto,
  UploadFinalDocumentDto,
  ExtendDeadlineDto,
} from './dto';
import { DeliverableStatus, RequesterType } from './entities/student-deliverable.entity';

/**
 * Toda ruta que opera sobre una postulación concreta pasa primero por
 * `applicationService.authorize(...)`, que comprueba que el usuario participa
 * en el proyecto y que su rol contextual permite la acción.
 *
 * Los decoradores `@Roles` siguen filtrando por rol global, pero no bastan: un
 * `faculty` puede ser asesor de un proyecto y jurado de otro, y un `student`
 * podía leer el expediente de cualquier otro con solo conocer el UUID.
 */
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

  @Get('admin/academic-queue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cola de trabajo académico: registros por estado' })
  getAcademicQueue(@Query() query: { status?: string; page?: string; limit?: string }) {
    return this.applicationService.getAcademicQueue({
      status: query.status,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
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
  findOne(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.findApplicationForViewer(id, user);
  }

  @Get(':id/context')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Contexto completo del proyecto para el panel: participantes, etapa, permisos del visor y acciones pendientes',
  })
  @ApiResponse({ status: 403, description: 'El usuario no participa en este proyecto' })
  getContext(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.getProjectContext(id, user);
  }

  @Patch(':id/notes')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar nota privada sobre el candidato (nunca visible para el estudiante)' })
  async updateNotes(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationNotesDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_private_notes');
    return this.applicationService.updateNotes(id, user.id, dto);
  }

  @Get(':id/timeline')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver historial de cambios de estado' })
  async getTimeline(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_activity');
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
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    await this.applicationService.authorize(id, user, 'change_application_status');
    return this.applicationService.updateStatus(id, user.id, dto);
  }

  @Patch(':id/withdraw')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Retirar una postulación (estudiante)' })
  async withdraw(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    await this.applicationService.authorize(id, user, 'withdraw_application');
    return this.applicationService.withdraw(id, user.id, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // ENTREVISTAS
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/interviews')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Programar una entrevista' })
  async scheduleInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleInterviewDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_interviews');
    return this.applicationService.scheduleInterview(id, user.id, dto);
  }

  @Get(':id/interviews')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver entrevistas de una postulación' })
  async getInterviews(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    const { viewer } = await this.applicationService.authorize(id, user, 'view_project');
    return this.applicationService.getInterviews(id, !viewer.permissions.includes('view_private_notes'));
  }

  @Patch(':id/interviews/:interviewId/brief')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cargar enunciado de prueba técnica (solo entrevistas tipo "technical")' })
  async setInterviewBrief(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: SetInterviewBriefDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_interviews');
    return this.applicationService.setInterviewBrief(id, interviewId, user.id, dto);
  }

  @Patch(':id/interviews/:interviewId/solution')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Subir solución de prueba técnica (estudiante)' })
  async setInterviewSolution(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: SetInterviewSolutionDto,
  ) {
    await this.applicationService.authorize(id, user, 'submit_interview_solution');
    return this.applicationService.setInterviewSolution(id, interviewId, user.id, dto);
  }

  @Patch(':id/interviews/:interviewId/complete')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Marcar entrevista como completada' })
  async completeInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: CompleteInterviewDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_interviews');
    return this.applicationService.completeInterview(id, interviewId, user.id, dto);
  }

  @Patch(':id/interviews/:interviewId/cancel')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancelar una entrevista' })
  async cancelInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: CancelInterviewDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_interviews');
    return this.applicationService.cancelInterview(id, interviewId, user.id, dto);
  }

  @Post(':id/interviews/:interviewId/reschedule')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reagendar una entrevista' })
  async rescheduleInterview(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: RescheduleInterviewDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_interviews');
    return this.applicationService.rescheduleInterview(id, interviewId, user.id, dto);
  }

  @Patch(':id/interviews/:interviewId/student-feedback')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'El estudiante comenta sobre la entrevista' })
  async setStudentInterviewFeedback(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('interviewId', ParseUUIDPipe) interviewId: string,
    @Body() dto: StudentInterviewFeedbackDto,
  ) {
    await this.applicationService.authorize(id, user, 'comment_interview');
    return this.applicationService.setStudentInterviewFeedback(id, interviewId, user.id, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // ENTREGABLES
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/deliverables')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Enviar un entregable' })
  async submitDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    await this.applicationService.authorize(id, user, 'submit_deliverable');
    return this.applicationService.submitDeliverable(id, user.id, dto);
  }

  @Patch(':id/deliverables/:deliverableId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Actualizar un entregable (revisión)' })
  async updateDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: SubmitDeliverableDto,
  ) {
    await this.applicationService.authorize(id, user, 'submit_deliverable');
    return this.applicationService.updateDeliverable(id, deliverableId, user.id, dto);
  }

  @Get(':id/deliverables')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver entregables de una postulación' })
  async getDeliverables(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    const { viewer } = await this.applicationService.authorize(id, user, 'view_deliverables');
    return this.applicationService.getDeliverables(id, viewer.contextRole);
  }

  @Patch(':id/deliverables/:deliverableId/approve')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Aprobar un entregable' })
  async approveDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    await this.applicationService.authorize(id, user, 'review_deliverable');
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
  async rejectDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    await this.applicationService.authorize(id, user, 'review_deliverable');
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
  async requestRevision(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: ReviewDeliverableDto,
  ) {
    await this.applicationService.authorize(id, user, 'review_deliverable');
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
  async createDeliverable(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    // El permiso `create_deliverable` solo lo tienen empresa, asesor y admin.
    // Un jurado, aunque sea `faculty`, recibe 403 aquí.
    const { viewer } = await this.applicationService.authorize(id, user, 'create_deliverable');
    const requesterType =
      viewer.contextRole === 'asesor' ? RequesterType.ASESOR : RequesterType.COMPANY;
    return this.applicationService.createDeliverable(id, user.id, dto, requesterType);
  }

  @Post('deliverables/bulk-create')
  @Roles(UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear el mismo entregable para múltiples postulaciones' })
  async bulkCreateDeliverable(@CurrentUser() user: any, @Body() dto: BulkCreateDeliverableDto) {
    // Se autoriza postulación por postulación: el solicitante puede supervisar
    // unas sí y otras no.
    const roles = await Promise.all(
      dto.applicationIds.map(async (applicationId) => {
        const { viewer } = await this.applicationService.authorize(
          applicationId,
          user,
          'create_deliverable',
        );
        return viewer.contextRole;
      }),
    );
    const requesterType = roles.every((r) => r === 'asesor')
      ? RequesterType.ASESOR
      : RequesterType.COMPANY;
    return this.applicationService.bulkCreateDeliverable(user.id, dto, requesterType);
  }

  // ──────────────────────────────────────────────────────────────────
  // DOCUMENTOS REQUERIDOS
  // ──────────────────────────────────────────────────────────────────

  @Get(':id/documents/requirements')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Documentos requeridos seleccionados por el admin para este proyecto' })
  async getProjectDocumentRequirements(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_documents');
    return this.applicationService.getProjectDocumentRequirements(id);
  }

  @Post(':id/documents/requirements')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Seleccionar (del catálogo) los documentos requeridos para este proyecto' })
  async selectDocumentRequirements(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SelectDocumentRequirementsDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_document_requirements');
    return this.applicationService.selectDocumentRequirements(id, user.id, dto);
  }

  @Post(':id/documents')
  @Roles(UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Cargar un documento requerido' })
  async uploadDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadDocumentDto,
  ) {
    const { viewer } = await this.applicationService.authorize(id, user, 'upload_document');
    return this.applicationService.uploadDocument(id, user.id, viewer.contextRole, dto);
  }

  @Get(':id/documents')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver documentos de la aplicación' })
  async getDocuments(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_documents');
    return this.applicationService.getDocuments(id);
  }

  @Patch(':id/documents/:docId/review')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Revisar (aprobar/rechazar) un documento (admin, o jurado final para documentos de finalización)' })
  async reviewDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    await this.applicationService.authorize(id, user, 'review_document');
    return this.applicationService.reviewDocument(id, docId, user.id, user.role, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // DOCUMENTOS DE SELECCIÓN (empresa → estudiante, fase de selección)
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/selection-documents')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Solicitar un documento adicional al estudiante durante la selección' })
  async requestSelectionDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestSelectionDocumentDto,
  ) {
    await this.applicationService.authorize(id, user, 'request_selection_document');
    return this.applicationService.requestSelectionDocument(id, user.id, dto);
  }

  @Get(':id/selection-documents')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver documentos de selección solicitados/entregados' })
  async getSelectionDocuments(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_selection_documents');
    return this.applicationService.getSelectionDocuments(id);
  }

  @Post(':id/selection-documents/:docId/submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Entregar el documento de selección solicitado' })
  async submitSelectionDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: SubmitSelectionDocumentDto,
  ) {
    await this.applicationService.authorize(id, user, 'upload_selection_document');
    return this.applicationService.submitSelectionDocument(id, docId, user.id, dto);
  }

  @Patch(':id/selection-documents/:docId/review')
  @Roles(UserRole.COMPANY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Revisar (aprobar/rechazar) un documento de selección entregado' })
  async reviewSelectionDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: ReviewSelectionDocumentDto,
  ) {
    await this.applicationService.authorize(id, user, 'review_selection_document');
    return this.applicationService.reviewSelectionDocument(id, docId, user.id, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // ANTEPROYECTO
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/anteproyecto')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Entregar o re-entregar el anteproyecto' })
  async submitAnteproyecto(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitAnteproyectoDto,
  ) {
    await this.applicationService.authorize(id, user, 'submit_anteproyecto');
    return this.applicationService.submitAnteproyecto(id, user.id, dto);
  }

  @Patch(':id/anteproyecto/asesor-comment')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Comentario del asesor en el anteproyecto (no aprueba ni rechaza)' })
  async addAsesorComment(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AsesorCommentDto,
  ) {
    await this.applicationService.authorize(id, user, 'comment_anteproyecto');
    return this.applicationService.addAsesorComment(id, user.id, dto);
  }

  @Patch(':id/anteproyecto/review')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Revisión del jurado: corrección, aprobación o rechazo' })
  async reviewAnteproyecto(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewAnteproyectoDto,
  ) {
    await this.applicationService.authorize(id, user, 'review_anteproyecto');
    return this.applicationService.reviewAnteproyecto(id, user.id, dto);
  }

  @Get(':id/anteproyecto')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Estado y versión actual del anteproyecto (verifica plazos vencidos)' })
  async getAnteproyecto(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_anteproyecto');
    return this.applicationService.checkAnteproyectoExpiry(id);
  }

  @Get(':id/anteproyecto/history')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Historial completo de versiones y acciones del anteproyecto' })
  async getAnteproyectoHistory(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_anteproyecto');
    return this.applicationService.getAnteproyectoHistory(id);
  }

  @Get(':id/anteproyecto/jurado-history')
  @Roles(UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Vista de solo lectura para un jurado que ya no tiene acceso activo (desvinculado tras aprobar)' })
  async getJuradoAnteproyectoHistory(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.applicationService.getJuradoAnteproyectoHistory(id, user.id);
  }

  @Patch(':id/anteproyecto/extend-deadline')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Extender un plazo vencido o por vencer del anteproyecto' })
  async extendAnteproyectoDeadline(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExtendDeadlineDto,
  ) {
    await this.applicationService.authorize(id, user, 'extend_deadline');
    return this.applicationService.extendAnteproyectoDeadline(id, user.id, dto);
  }

  // ──────────────────────────────────────────────────────────────────
  // COMENTARIOS EN ENTREGABLES
  // ──────────────────────────────────────────────────────────────────

  @Post(':id/deliverables/:deliverableId/comments')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Comentar en un entregable' })
  async addDeliverableComment(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @Body() dto: CreateDeliverableCommentDto,
  ) {
    const { viewer } = await this.applicationService.authorize(id, user, 'comment_deliverable');
    return this.applicationService.addDeliverableComment(
      deliverableId,
      user.id,
      viewer.contextRole,
      dto,
    );
  }

  @Get(':id/deliverables/:deliverableId/comments')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver comentarios de un entregable' })
  async getDeliverableComments(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
  ) {
    const { viewer } = await this.applicationService.authorize(id, user, 'view_deliverables');
    return this.applicationService.getDeliverableComments(deliverableId, viewer.contextRole);
  }

  // ──────────────────────────────────────────────────────────────────
  // REGISTRO ACADÉMICO Y ACUERDO DE INICIACIÓN
  // ──────────────────────────────────────────────────────────────────

  @Get(':id/academic-record')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registro académico de la postulación' })
  async getAcademicRecord(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_academic_record');
    return this.applicationService.getAcademicRecord(id);
  }

  @Get(':id/academic-record/checklist')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Checklist de precondiciones para el acuerdo de iniciación' })
  async getInitiationChecklist(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_academic_record');
    return this.applicationService.getInitiationChecklist(id);
  }

  @Patch(':id/academic-record/initiation-agreement')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cargar el acuerdo de iniciación (valida precondiciones)' })
  async uploadInitiationAgreement(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadInitiationAgreementDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_initiation_agreement');
    return this.applicationService.uploadInitiationAgreement(id, user.id, dto);
  }

  @Get(':id/progress')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Progreso del proyecto activo (50% temporal + 50% entregables)' })
  async getProgress(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    await this.applicationService.authorize(id, user, 'view_progress');
    return this.applicationService.getProgress(id);
  }

  // ──────────────────────────────────────────────────────────────────
  // FINALIZACIÓN Y SUSTENTACIÓN
  // ──────────────────────────────────────────────────────────────────

  @Patch(':id/finalization/start')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Iniciar la fase de finalización con lista de documentos requeridos' })
  async startFinalization(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartFinalizationDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_finalization');
    return this.applicationService.startFinalization(id, user.id, dto);
  }

  @Get(':id/finalization/documents')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar los documentos finales requeridos y subidos' })
  async getFinalDocuments(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.applicationService.authorize(id, user, 'view_final_documents');
    return this.applicationService.getFinalDocuments(id);
  }

  @Post(':id/finalization/documents')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Subir un documento final (según el actor asignado)' })
  async uploadFinalDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadFinalDocumentDto,
  ) {
    const { viewer } = await this.applicationService.authorize(id, user, 'upload_final_document');
    return this.applicationService.uploadFinalDocument(id, user.id, viewer.contextRole, dto);
  }

  @Patch(':id/finalization/documents/:docId/review')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revisar (aprobar/rechazar) un documento final' })
  async reviewFinalDocument(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Body() dto: ReviewDocumentDto,
  ) {
    const { viewer } = await this.applicationService.authorize(id, user, 'review_final_document');
    return this.applicationService.reviewDocument(id, docId, user.id, viewer.contextRole, dto);
  }

  @Patch(':id/finalization/advance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verificar documentos finales y avanzar el estado de finalización' })
  async advanceFinalization(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.applicationService.authorize(id, user, 'manage_finalization');
    return this.applicationService.advanceFinalization(id);
  }

  @Patch(':id/finalization/final-grade')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cargar la nota final y marcar el proyecto como completado' })
  async uploadFinalGrade(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadFinalGradeDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_finalization');
    return this.applicationService.uploadFinalGrade(id, user.id, dto);
  }

  @Patch(':id/finalization/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancelar el proceso de finalización (o el proyecto en curso)' })
  async cancelFinalization(
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelFinalizationDto,
  ) {
    await this.applicationService.authorize(id, user, 'manage_finalization');
    return this.applicationService.cancelFinalization(id, user.id, dto.reason);
  }
}

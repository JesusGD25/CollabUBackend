import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  UserRole,
} from '@collab-u/shared';

import { AdminService } from './admin.service';
import {
  CreateAcademicPeriodDto,
  UpdateAcademicPeriodDto,
  CreateAcademicProgramDto,
  UpdateAcademicProgramDto,
  VerifyCompanyDto,
  AssignSupervisorDto,
  CreateSupervisorDto,
  UpdateSystemSettingDto,
  PeriodsQueryDto,
  UpdateSupervisorDto,
  CreateRejectionCategoryDto,
  UpdateRejectionCategoryDto,
  DeclineAssignmentDto,
  ReplaceAssignmentDto,
  CreateAcademicTemplateDto,
  UpdateAcademicTemplateDto,
  CreateDocumentRequirementDto,
  UpdateDocumentRequirementDto,
  AssignJuradoDto,
  CreateSkillCatalogDto,
  UpdateSkillCatalogDto,
  AssociateSkillProgramsDto,
} from './dto';
import { SkillCategory } from './entities';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Dashboard administrativo' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // ─── Academic Periods ────────────────────────────────────────────────────────

  @Get('periods')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Listar períodos académicos' })
  getPeriods(@Query() query: PeriodsQueryDto) {
    return this.adminService.getPeriods(query);
  }

  @Post('periods')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear período académico' })
  createPeriod(@Body() dto: CreateAcademicPeriodDto) {
    return this.adminService.createPeriod(dto);
  }

  @Get('periods/:id')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Obtener período académico por ID' })
  getPeriodById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getPeriodById(id);
  }

  @Put('periods/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar período académico' })
  updatePeriod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicPeriodDto,
  ) {
    return this.adminService.updatePeriod(id, dto);
  }

  // ─── Academic Programs ───────────────────────────────────────────────────────

  @Get('programs')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Listar programas académicos' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  getPrograms(@Query('isActive') isActive?: string) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.adminService.getPrograms(active);
  }

  @Post('programs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear programa académico' })
  createProgram(@Body() dto: CreateAcademicProgramDto) {
    return this.adminService.createProgram(dto);
  }

  @Get('programs/:id')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Obtener programa académico por ID' })
  getProgramById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getProgramById(id);
  }

  @Put('programs/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar programa académico' })
  updateProgram(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAcademicProgramDto,
  ) {
    return this.adminService.updateProgram(id, dto);
  }

  // ─── Company Verifications ────────────────────────────────────────────────────

  @Get('companies/verifications')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Listar historial de verificaciones de empresas' })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getCompanyVerifications(
    @Query('companyId') companyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getCompanyVerifications(companyId, page, limit);
  }

  @Put('companies/:companyId/verify')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Verificar/aprobar una empresa' })
  verifyCompany(
    @CurrentUser() user: any,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Body() dto: VerifyCompanyDto,
  ) {
    return this.adminService.verifyCompany(user.id, { ...dto, companyId });
  }

  // ─── Supervisors ──────────────────────────────────────────────────────────────

  @Get('supervisors')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Listar supervisores' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'onboardingComplete', required: false, type: Boolean })
  getSupervisors(
    @Query('isActive') isActive?: string,
    @Query('onboardingComplete') onboardingComplete?: string,
  ) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    const onboarded = onboardingComplete !== undefined ? onboardingComplete === 'true' : undefined;
    return this.adminService.getSupervisors(active, onboarded);
  }

  @Post('supervisors')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar supervisor' })
  createSupervisor(@Body() dto: CreateSupervisorDto) {
    return this.adminService.createSupervisor(dto);
  }

  @Post('supervisors/assign')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Asignar supervisor académico a estudiante/proyecto' })
  assignSupervisor(@CurrentUser() user: any, @Body() dto: AssignSupervisorDto) {
    return this.adminService.assignSupervisor(user.id, dto);
  }

  @Post('supervisors/assign-jurado')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Asignar jurado final (auto-aceptado)' })
  assignJurado(@CurrentUser() user: any, @Body() dto: AssignJuradoDto) {
    return this.adminService.assignJurado(user.id, dto);
  }

  @Get('supervisors/my-students')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Listar mis estudiantes supervisados' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'enriched', required: false, type: Boolean })
  getMySupervisedStudents(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('enriched') enriched?: string,
  ) {
    if (enriched === 'true') {
      return this.adminService.getMySupervisedStudentsEnriched(user.id, status, page, limit);
    }
    return this.adminService.getMySupervisedStudents(user.id, status, page, limit);
  }

  @Get('supervisors/assignments/:id')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Obtener detalle de una asignación de supervisor' })
  @ApiParam({ name: 'id', type: 'string' })
  getAssignmentById(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.adminService.getAssignmentById(id, user.id);
  }

  @Patch('supervisors/assignments/:id/accept')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Aceptar mi asignación como asesor (inicia el proyecto)' })
  @ApiParam({ name: 'id', type: 'string' })
  acceptAssignment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.acceptAssignment(id, user.id);
  }

  @Patch('supervisors/assignments/:id/decline')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Declinar mi asignación como asesor (con motivo)' })
  @ApiParam({ name: 'id', type: 'string' })
  declineAssignment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: DeclineAssignmentDto,
  ) {
    return this.adminService.declineAssignment(id, user.id, dto);
  }

  @Patch('supervisors/assignments/:id/replace')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reemplazar al asesor de una asignación' })
  @ApiParam({ name: 'id', type: 'string' })
  replaceAssignment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: ReplaceAssignmentDto,
  ) {
    return this.adminService.replaceAssignment(id, user.id, dto);
  }

  @Patch('supervisors/assignments/:id/disconnect')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desvincular a un jurado al completar su fase' })
  @ApiParam({ name: 'id', type: 'string' })
  disconnectAssignment(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.disconnectAssignment(id, user.id);
  }

  @Get('supervisors/assignments/:id/history')
  @Roles(UserRole.ADMIN, UserRole.FACULTY)
  @ApiOperation({ summary: 'Historial de una asignación (creación, aceptación, reemplazos, etc.)' })
  @ApiParam({ name: 'id', type: 'string' })
  getAssignmentHistory(@Param('id') id: string) {
    return this.adminService.getAssignmentHistory(id);
  }

  @Get('supervisors/me')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Obtener mi perfil de supervisor' })
  getMyProfile(@CurrentUser() user: any) {
    return this.adminService.getMyProfile(user.id);
  }

  @Patch('supervisors/me')
  @Roles(UserRole.FACULTY)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar mi perfil de supervisor' })
  updateMyProfile(@CurrentUser() user: any, @Body() dto: UpdateSupervisorDto) {
    return this.adminService.updateMyProfile(user.id, dto);
  }

  // ─── System Settings ──────────────────────────────────────────────────────────

  @Get('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar configuraciones del sistema' })
  @ApiQuery({ name: 'category', required: false, type: String })
  getSettings(@Query('category') category?: string) {
    return this.adminService.getSettings(category);
  }

  @Put('settings')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear o actualizar configuración del sistema' })
  upsertSetting(@CurrentUser() user: any, @Body() dto: UpdateSystemSettingDto) {
    return this.adminService.upsertSetting(user.id, dto);
  }

  @Get('settings/:key')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener configuración por clave' })
  getSettingByKey(@Param('key') key: string) {
    return this.adminService.getSettingByKey(key);
  }

  // ─── Categorías de rechazo de proyectos ───────────────────────────────────────

  @Get('rejection-categories')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.FACULTY)
  @ApiOperation({ summary: 'Listar categorías de rechazo de proyectos' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  getRejectionCategories(@Query('onlyActive') onlyActive?: string) {
    return this.adminService.getRejectionCategories(onlyActive === 'true');
  }

  @Post('rejection-categories')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear categoría de rechazo de proyecto' })
  createRejectionCategory(@Body() dto: CreateRejectionCategoryDto) {
    return this.adminService.createRejectionCategory(dto);
  }

  @Patch('rejection-categories/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoría de rechazo de proyecto' })
  updateRejectionCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRejectionCategoryDto,
  ) {
    return this.adminService.updateRejectionCategory(id, dto);
  }

  // ─── Plantillas académicas ─────────────────────────────────────────────────────

  @Get('templates')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Listar plantillas de documentos académicos' })
  @ApiQuery({ name: 'programCode', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  getTemplates(
    @Query('programCode') programCode?: string,
    @Query('type') type?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    return this.adminService.getTemplates(programCode, type, onlyActive === 'true');
  }

  @Post('templates')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar plantilla de documento académico' })
  createTemplate(@CurrentUser() user: any, @Body() dto: CreateAcademicTemplateDto) {
    return this.adminService.createTemplate(user.id, dto);
  }

  @Get('templates/:id')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  getTemplateById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getTemplateById(id);
  }

  @Patch('templates/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar plantilla de documento académico' })
  updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAcademicTemplateDto) {
    return this.adminService.updateTemplate(id, dto);
  }

  // ─── Documentos requeridos ──────────────────────────────────────────────────────

  @Get('document-requirements')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Listar documentos requeridos configurados' })
  @ApiQuery({ name: 'actorType', required: false, type: String })
  @ApiQuery({ name: 'requiredAtStage', required: false, type: String })
  @ApiQuery({ name: 'projectType', required: false, type: String })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean })
  getDocumentRequirements(
    @Query('actorType') actorType?: string,
    @Query('requiredAtStage') requiredAtStage?: string,
    @Query('projectType') projectType?: string,
    @Query('onlyActive') onlyActive?: string,
  ) {
    return this.adminService.getDocumentRequirements({
      actorType,
      requiredAtStage,
      projectType,
      onlyActive: onlyActive === 'true',
    });
  }

  @Post('document-requirements')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Configurar un documento requerido' })
  createDocumentRequirement(@CurrentUser() user: any, @Body() dto: CreateDocumentRequirementDto) {
    return this.adminService.createDocumentRequirement(user.id, dto);
  }

  @Get('document-requirements/:id')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Obtener documento requerido por ID' })
  getDocumentRequirementById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getDocumentRequirementById(id);
  }

  @Patch('document-requirements/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar documento requerido' })
  updateDocumentRequirement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentRequirementDto,
  ) {
    return this.adminService.updateDocumentRequirement(id, dto);
  }

  // ─── Catálogo de habilidades ────────────────────────────────────────────────────

  @Get('skills')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Listar catálogo de habilidades' })
  @ApiQuery({ name: 'programId', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, enum: SkillCategory })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  getSkills(
    @CurrentUser() user: any,
    @Query('programId') programId?: string,
    @Query('category') category?: SkillCategory,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    // Solo el admin puede ver habilidades desactivadas (para gestionar el catálogo).
    const onlyActive = !(includeInactive === 'true' && user?.role === UserRole.ADMIN);
    return this.adminService.getSkills({ programId, category, search, onlyActive });
  }

  @Post('skills')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear habilidad en el catálogo' })
  createSkill(@CurrentUser() user: any, @Body() dto: CreateSkillCatalogDto) {
    return this.adminService.createSkill(user.id, dto);
  }

  @Get('skills/by-program/:programId')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Listar habilidades asociadas a un programa académico' })
  getSkillsByProgram(@Param('programId', ParseUUIDPipe) programId: string) {
    return this.adminService.getSkillsByProgram(programId);
  }

  @Get('skills/:id')
  @Roles(UserRole.ADMIN, UserRole.FACULTY, UserRole.STUDENT, UserRole.COMPANY)
  @ApiOperation({ summary: 'Obtener habilidad del catálogo por ID' })
  getSkillById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getSkillById(id);
  }

  @Patch('skills/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar habilidad del catálogo' })
  updateSkill(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSkillCatalogDto) {
    return this.adminService.updateSkill(id, dto);
  }

  @Patch('skills/:id/deactivate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar habilidad del catálogo (soft-delete)' })
  deactivateSkill(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deactivateSkill(id);
  }

  @Post('skills/:skillId/programs')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Asociar habilidad a uno o más programas académicos' })
  associateSkillPrograms(
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @Body() dto: AssociateSkillProgramsDto,
  ) {
    return this.adminService.associateSkillPrograms(skillId, dto.programIds);
  }

  @Delete('skills/:skillId/programs/:programId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desasociar habilidad de un programa académico' })
  disassociateSkillProgram(
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @Param('programId', ParseUUIDPipe) programId: string,
  ) {
    return this.adminService.disassociateSkillProgram(skillId, programId);
  }
}

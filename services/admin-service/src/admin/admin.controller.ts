import {
  Controller,
  Get,
  Post,
  Put,
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
} from './dto';

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
  getSupervisors(@Query('isActive') isActive?: string) {
    const active = isActive !== undefined ? isActive === 'true' : undefined;
    return this.adminService.getSupervisors(active);
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

  @Get('supervisors/my-students')
  @Roles(UserRole.FACULTY)
  @ApiOperation({ summary: 'Listar mis estudiantes supervisados' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getMySupervisedStudents(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getMySupervisedStudents(user.id, status, page, limit);
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
}

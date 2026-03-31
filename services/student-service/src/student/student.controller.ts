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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@collab-u/shared';

import { StudentService } from './student.service';
import { CreateStudentProfileDto } from './dto/create-student-profile.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { CreateInterestDto } from './dto/create-interest.dto';
import { UpdateInterestDto } from './dto/update-interest.dto';
import { StudentSearchQueryDto } from './dto/student-search-query.dto';

@ApiTags('Students')
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // ── PERFIL ──

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear perfil de estudiante' })
  @ApiResponse({ status: 201, description: 'Perfil creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe un perfil para este usuario' })
  async createProfile(@CurrentUser() user: any, @Body() dto: CreateStudentProfileDto) {
    dto.userId = user.userId;
    return this.studentService.createProfile(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil propio' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.studentService.getProfile(user.userId);
  }

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil de un estudiante por userId' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getProfileByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.studentService.getProfileById(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil propio' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateStudentProfileDto) {
    return this.studentService.updateProfile(user.userId, dto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar estudiantes con filtros' })
  @ApiResponse({ status: 200, description: 'Resultados paginados' })
  async searchStudents(@Query() query: StudentSearchQueryDto) {
    return this.studentService.searchStudents(query);
  }

  // ── SKILLS ──

  @Get('skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener habilidades del estudiante' })
  async getSkills(@CurrentUser() user: any) {
    return this.studentService.getSkills(user.userId);
  }

  @Post('skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar habilidad' })
  @ApiResponse({ status: 201, description: 'Habilidad agregada' })
  async addSkill(@CurrentUser() user: any, @Body() dto: CreateSkillDto) {
    return this.studentService.addSkill(user.userId, dto);
  }

  @Post('skills/batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar múltiples habilidades' })
  @ApiResponse({ status: 201, description: 'Habilidades agregadas' })
  async addSkillsBatch(@CurrentUser() user: any, @Body() dtos: CreateSkillDto[]) {
    return this.studentService.addSkillsBatch(user.userId, dtos);
  }

  @Patch('skills/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar habilidad' })
  @ApiParam({ name: 'skillId', type: 'string', format: 'uuid' })
  async updateSkill(
    @CurrentUser() user: any,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.studentService.updateSkill(user.userId, skillId, dto);
  }

  @Delete('skills/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar habilidad' })
  @ApiParam({ name: 'skillId', type: 'string', format: 'uuid' })
  async deleteSkill(
    @CurrentUser() user: any,
    @Param('skillId', ParseUUIDPipe) skillId: string,
  ) {
    return this.studentService.deleteSkill(user.userId, skillId);
  }

  // ── EXPERIENCIA ──

  @Get('experiences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener experiencias del estudiante' })
  async getExperiences(@CurrentUser() user: any) {
    return this.studentService.getExperiences(user.userId);
  }

  @Post('experiences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar experiencia' })
  @ApiResponse({ status: 201, description: 'Experiencia agregada' })
  async addExperience(@CurrentUser() user: any, @Body() dto: CreateExperienceDto) {
    return this.studentService.addExperience(user.userId, dto);
  }

  @Patch('experiences/:expId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar experiencia' })
  @ApiParam({ name: 'expId', type: 'string', format: 'uuid' })
  async updateExperience(
    @CurrentUser() user: any,
    @Param('expId', ParseUUIDPipe) expId: string,
    @Body() dto: UpdateExperienceDto,
  ) {
    return this.studentService.updateExperience(user.userId, expId, dto);
  }

  @Delete('experiences/:expId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar experiencia' })
  @ApiParam({ name: 'expId', type: 'string', format: 'uuid' })
  async deleteExperience(
    @CurrentUser() user: any,
    @Param('expId', ParseUUIDPipe) expId: string,
  ) {
    return this.studentService.deleteExperience(user.userId, expId);
  }

  // ── EDUCACIÓN ──

  @Get('education')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener formación académica del estudiante' })
  async getEducation(@CurrentUser() user: any) {
    return this.studentService.getEducation(user.userId);
  }

  @Post('education')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar formación académica' })
  @ApiResponse({ status: 201, description: 'Formación agregada' })
  async addEducation(@CurrentUser() user: any, @Body() dto: CreateEducationDto) {
    return this.studentService.addEducation(user.userId, dto);
  }

  @Patch('education/:eduId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar formación académica' })
  @ApiParam({ name: 'eduId', type: 'string', format: 'uuid' })
  async updateEducation(
    @CurrentUser() user: any,
    @Param('eduId', ParseUUIDPipe) eduId: string,
    @Body() dto: UpdateEducationDto,
  ) {
    return this.studentService.updateEducation(user.userId, eduId, dto);
  }

  @Delete('education/:eduId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar formación académica' })
  @ApiParam({ name: 'eduId', type: 'string', format: 'uuid' })
  async deleteEducation(
    @CurrentUser() user: any,
    @Param('eduId', ParseUUIDPipe) eduId: string,
  ) {
    return this.studentService.deleteEducation(user.userId, eduId);
  }

  // ── CERTIFICACIONES ──

  @Get('certifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener certificaciones del estudiante' })
  async getCertifications(@CurrentUser() user: any) {
    return this.studentService.getCertifications(user.userId);
  }

  @Post('certifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar certificación' })
  @ApiResponse({ status: 201, description: 'Certificación agregada' })
  async addCertification(@CurrentUser() user: any, @Body() dto: CreateCertificationDto) {
    return this.studentService.addCertification(user.userId, dto);
  }

  @Patch('certifications/:certId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar certificación' })
  @ApiParam({ name: 'certId', type: 'string', format: 'uuid' })
  async updateCertification(
    @CurrentUser() user: any,
    @Param('certId', ParseUUIDPipe) certId: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    return this.studentService.updateCertification(user.userId, certId, dto);
  }

  @Delete('certifications/:certId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar certificación' })
  @ApiParam({ name: 'certId', type: 'string', format: 'uuid' })
  async deleteCertification(
    @CurrentUser() user: any,
    @Param('certId', ParseUUIDPipe) certId: string,
  ) {
    return this.studentService.deleteCertification(user.userId, certId);
  }

  // ── IDIOMAS ──

  @Get('languages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener idiomas del estudiante' })
  async getLanguages(@CurrentUser() user: any) {
    return this.studentService.getLanguages(user.userId);
  }

  @Post('languages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar idioma' })
  @ApiResponse({ status: 201, description: 'Idioma agregado' })
  async addLanguage(@CurrentUser() user: any, @Body() dto: CreateLanguageDto) {
    return this.studentService.addLanguage(user.userId, dto);
  }

  @Patch('languages/:langId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar idioma' })
  @ApiParam({ name: 'langId', type: 'string', format: 'uuid' })
  async updateLanguage(
    @CurrentUser() user: any,
    @Param('langId', ParseUUIDPipe) langId: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.studentService.updateLanguage(user.userId, langId, dto);
  }

  @Delete('languages/:langId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar idioma' })
  @ApiParam({ name: 'langId', type: 'string', format: 'uuid' })
  async deleteLanguage(
    @CurrentUser() user: any,
    @Param('langId', ParseUUIDPipe) langId: string,
  ) {
    return this.studentService.deleteLanguage(user.userId, langId);
  }

  // ── INTERESES ──

  @Get('interests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener intereses del estudiante' })
  async getInterests(@CurrentUser() user: any) {
    return this.studentService.getInterests(user.userId);
  }

  @Post('interests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar interés' })
  @ApiResponse({ status: 201, description: 'Interés agregado' })
  async addInterest(@CurrentUser() user: any, @Body() dto: CreateInterestDto) {
    return this.studentService.addInterest(user.userId, dto);
  }

  @Patch('interests/:intId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar interés' })
  @ApiParam({ name: 'intId', type: 'string', format: 'uuid' })
  async updateInterest(
    @CurrentUser() user: any,
    @Param('intId', ParseUUIDPipe) intId: string,
    @Body() dto: UpdateInterestDto,
  ) {
    return this.studentService.updateInterest(user.userId, intId, dto);
  }

  @Delete('interests/:intId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar interés' })
  @ApiParam({ name: 'intId', type: 'string', format: 'uuid' })
  async deleteInterest(
    @CurrentUser() user: any,
    @Param('intId', ParseUUIDPipe) intId: string,
  ) {
    return this.studentService.deleteInterest(user.userId, intId);
  }
}

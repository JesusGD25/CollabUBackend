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

import { CompanyService } from './company.service';
import {
  CreateCompanyProfileDto,
  UpdateCompanyProfileDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateContactDto,
  UpdateContactDto,
  CreateBusinessAreaDto,
  CompanySearchQueryDto,
} from './dto';

@ApiTags('Companies')
@Controller('api/v1/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  // ── PERFIL ──

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear perfil de empresa' })
  @ApiResponse({ status: 201, description: 'Perfil creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Ya existe un perfil para este usuario' })
  async createProfile(@CurrentUser() user: any, @Body() dto: CreateCompanyProfileDto) {
    dto.userId = user.userId;
    return this.companyService.createProfile(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil propio' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getMyProfile(@CurrentUser() user: any) {
    return this.companyService.getProfile(user.userId);
  }

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil de una empresa por userId' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Perfil obtenido' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getProfileByUserId(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.companyService.getProfileById(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil propio' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  async updateProfile(@CurrentUser() user: any, @Body() dto: UpdateCompanyProfileDto) {
    return this.companyService.updateProfile(user.userId, dto);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar empresas con filtros' })
  @ApiResponse({ status: 200, description: 'Resultados paginados' })
  async searchCompanies(@Query() query: CompanySearchQueryDto) {
    return this.companyService.searchCompanies(query);
  }

  // ── UBICACIONES ──

  @Get('locations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener ubicaciones de la empresa' })
  async getLocations(@CurrentUser() user: any) {
    return this.companyService.getLocations(user.userId);
  }

  @Post('locations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar ubicación' })
  @ApiResponse({ status: 201, description: 'Ubicación agregada' })
  async addLocation(@CurrentUser() user: any, @Body() dto: CreateLocationDto) {
    return this.companyService.addLocation(user.userId, dto);
  }

  @Patch('locations/:locationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar ubicación' })
  @ApiParam({ name: 'locationId', type: 'string', format: 'uuid' })
  async updateLocation(
    @CurrentUser() user: any,
    @Param('locationId', ParseUUIDPipe) locationId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.companyService.updateLocation(user.userId, locationId, dto);
  }

  @Delete('locations/:locationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar ubicación' })
  @ApiParam({ name: 'locationId', type: 'string', format: 'uuid' })
  async deleteLocation(
    @CurrentUser() user: any,
    @Param('locationId', ParseUUIDPipe) locationId: string,
  ) {
    return this.companyService.deleteLocation(user.userId, locationId);
  }

  // ── CONTACTOS ──

  @Get('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener contactos de la empresa' })
  async getContacts(@CurrentUser() user: any) {
    return this.companyService.getContacts(user.userId);
  }

  @Post('contacts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar contacto' })
  @ApiResponse({ status: 201, description: 'Contacto agregado' })
  async addContact(@CurrentUser() user: any, @Body() dto: CreateContactDto) {
    return this.companyService.addContact(user.userId, dto);
  }

  @Patch('contacts/:contactId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar contacto' })
  @ApiParam({ name: 'contactId', type: 'string', format: 'uuid' })
  async updateContact(
    @CurrentUser() user: any,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.companyService.updateContact(user.userId, contactId, dto);
  }

  @Delete('contacts/:contactId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar contacto' })
  @ApiParam({ name: 'contactId', type: 'string', format: 'uuid' })
  async deleteContact(
    @CurrentUser() user: any,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.companyService.deleteContact(user.userId, contactId);
  }

  // ── ÁREAS DE NEGOCIO ──

  @Get('business-areas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener áreas de negocio' })
  async getBusinessAreas(@CurrentUser() user: any) {
    return this.companyService.getBusinessAreas(user.userId);
  }

  @Post('business-areas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar área de negocio' })
  @ApiResponse({ status: 201, description: 'Área agregada' })
  async addBusinessArea(@CurrentUser() user: any, @Body() dto: CreateBusinessAreaDto) {
    return this.companyService.addBusinessArea(user.userId, dto);
  }

  @Delete('business-areas/:areaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COMPANY)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar área de negocio' })
  @ApiParam({ name: 'areaId', type: 'string', format: 'uuid' })
  async deleteBusinessArea(
    @CurrentUser() user: any,
    @Param('areaId', ParseUUIDPipe) areaId: string,
  ) {
    return this.companyService.deleteBusinessArea(user.userId, areaId);
  }
}

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
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@collab-u/shared';
import { UsersService } from './users.service';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { ActivityLogQueryDto } from './dto/activity-log-query.dto';

@ApiTags('Users')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear perfil de usuario' })
  @ApiResponse({ status: 201, description: 'Perfil creado' })
  @ApiResponse({ status: 409, description: 'Perfil ya existe' })
  async createProfile(@Request() req: any, @Body() dto: CreateUserProfileDto) {
    // Forzar el userId del token
    dto.userId = req.user.id;
    return this.usersService.createProfile(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener mi perfil' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getMyProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get('profile/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil por userId' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getProfileById(@Param('userId') userId: string) {
    return this.usersService.getProfileById(userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar mi perfil' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateUserProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar avatar del usuario' })
  @ApiResponse({ status: 200, description: 'Avatar actualizado' })
  async uploadAvatar(@Request() req: any, @Body('avatarUrl') avatarUrl: string) {
    return this.usersService.updateProfile(req.user.id, { avatarUrl });
  }

  @Delete('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar avatar' })
  @ApiResponse({ status: 200, description: 'Avatar eliminado' })
  async deleteAvatar(@Request() req: any) {
    return this.usersService.updateProfile(req.user.id, { avatarUrl: null as any });
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener configuración' })
  @ApiResponse({ status: 200, description: 'Configuración del usuario' })
  async getSettings(@Request() req: any) {
    const profile = await this.usersService.getProfile(req.user.id);
    return profile.settings;
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar configuración' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  async updateSettings(@Request() req: any, @Body() dto: UpdateUserSettingsDto) {
    return this.usersService.updateSettings(req.user.id, dto);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener historial de actividad' })
  @ApiResponse({ status: 200, description: 'Historial de actividad paginado' })
  async getActivityLog(@Request() req: any, @Query() query: ActivityLogQueryDto) {
    return this.usersService.getActivityLog(req.user.id, query);
  }
}

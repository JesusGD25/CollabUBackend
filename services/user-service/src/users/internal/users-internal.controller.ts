import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../users.service';

@ApiTags('Users Internal')
@Controller('internal/users')
export class UsersInternalController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile/:userId/basic')
  @ApiOperation({ summary: 'Obtener perfil básico (inter-servicio)' })
  @ApiResponse({ status: 200, description: 'Perfil básico' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getBasicProfile(@Param('userId') userId: string) {
    return this.usersService.getBasicProfile(userId);
  }

  @Post('batch-basic')
  @ApiOperation({ summary: 'Obtener perfiles básicos en batch (inter-servicio)' })
  @ApiResponse({ status: 200, description: 'Perfiles básicos' })
  async getBatchBasicProfiles(@Body() body: { userIds: string[] }) {
    return this.usersService.getBatchBasicProfiles(body.userIds);
  }
}

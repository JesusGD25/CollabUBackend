import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from '../auth.service';

@ApiTags('Auth Internal')
@Controller('internal/auth')
export class AuthInternalController {
  constructor(private readonly authService: AuthService) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validar token JWT (inter-servicio)' })
  @ApiResponse({ status: 200, description: 'Token validado' })
  async validateToken(@Body() body: { token: string }) {
    return this.authService.validateToken(body.token);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Obtener usuario por ID (inter-servicio)' })
  @ApiResponse({ status: 200, description: 'Datos básicos del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }

  @Get('users/:id/role')
  @ApiOperation({ summary: 'Obtener rol del usuario (inter-servicio)' })
  @ApiResponse({ status: 200, description: 'Rol del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getUserRole(@Param('id') id: string) {
    return this.authService.getUserRole(id);
  }
}

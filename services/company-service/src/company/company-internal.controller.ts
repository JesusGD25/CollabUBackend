import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import { CompanyService } from './company.service';

@ApiTags('Companies Internal')
@Controller('internal/companies')
export class CompanyInternalController {
  constructor(private readonly companyService: CompanyService) {}

  @Get(':userId/basic-info')
  @ApiOperation({ summary: 'Obtener datos básicos de empresa (uso interno)' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Datos básicos obtenidos' })
  @ApiResponse({ status: 404, description: 'Empresa no encontrada' })
  async getBasicInfo(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.companyService.getBasicInfo(userId);
  }

  @Get(':userId/exists')
  @ApiOperation({ summary: 'Verificar si existe perfil de empresa (uso interno)' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Resultado de existencia' })
  async exists(@Param('userId', ParseUUIDPipe) userId: string) {
    const exists = await this.companyService.exists(userId);
    return { exists };
  }

  @Post('update-rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar rating de empresa (uso interno)' })
  @ApiResponse({ status: 200, description: 'Rating actualizado' })
  async updateRating(
    @Body() body: { companyUserId: string; rating: number; totalReviews: number },
  ) {
    await this.companyService.updateRating(body.companyUserId, body.rating, body.totalReviews);
    return { message: 'Rating actualizado correctamente' };
  }
}

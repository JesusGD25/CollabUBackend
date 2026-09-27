import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { StudentService } from './student.service';

@ApiTags('Students Internal')
@Controller('internal/students')
export class StudentInternalController {
  constructor(private readonly studentService: StudentService) {}

  @Get(':userId/matching-data')
  @ApiOperation({ summary: 'Obtener datos para matching (uso interno)' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Datos de matching obtenidos' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado' })
  async getMatchingData(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.studentService.getMatchingData(userId);
  }

  @Get('analytics/stats')
  @ApiOperation({ summary: 'Estadísticas agregadas de estudiantes (uso interno)' })
  @ApiQuery({ name: 'from', required: false, type: 'string' })
  @ApiQuery({ name: 'to', required: false, type: 'string' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas' })
  async getAnalyticsStats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.studentService.getAnalyticsStats(from, to);
  }

  @Get('skills/supply')
  @ApiOperation({ summary: 'Oferta actual de skills entre estudiantes (uso interno)' })
  @ApiResponse({ status: 200, description: 'Oferta de skills obtenida' })
  async getSkillsSupply() {
    return this.studentService.getSkillsSupply();
  }

  @Post('update-rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar rating de estudiante (uso interno)' })
  @ApiResponse({ status: 200, description: 'Rating actualizado' })
  async updateRating(
    @Body() body: { studentUserId: string; averageRating: number; totalRatings: number },
  ) {
    await this.studentService.updateRating(body.studentUserId, body.averageRating, body.totalRatings);
    return { message: 'Rating actualizado correctamente' };
  }
}

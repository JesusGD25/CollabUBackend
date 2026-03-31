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

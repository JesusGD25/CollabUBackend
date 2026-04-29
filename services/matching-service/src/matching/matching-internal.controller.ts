import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MatchingService } from './matching.service';
import { CalculateMatchDto, BatchCalculateMatchDto } from './dto';

/**
 * Endpoints internos para comunicación entre microservicios.
 * No requieren autenticación JWT — solo accesibles desde la red interna.
 */
@ApiTags('Internal - Matching')
@Controller('internal/matching')
export class MatchingInternalController {
  private readonly logger = new Logger(MatchingInternalController.name);

  constructor(private readonly matchingService: MatchingService) {}

  /**
   * Llamado por el Application Service al crear una postulación.
   * Retorna el score de manera no bloqueante (falla silenciosa).
   */
  @Post('calculate-for-application')
  @ApiOperation({ summary: 'Calcular match score para una postulación (llamado por Application Service)' })
  @ApiResponse({ status: 201, description: 'Score calculado exitosamente' })
  @ApiResponse({ status: 200, description: 'Score calculado (resultado existente actualizado)' })
  async calculateForApplication(@Body() dto: CalculateMatchDto) {
    this.logger.log(`Calculando match: student=${dto.studentId}, project=${dto.projectId}`);
    const score = await this.matchingService.calculateForApplication(dto.studentId, dto.projectId);
    return { studentId: dto.studentId, projectId: dto.projectId, score };
  }

  /**
   * Cálculo en lote — llamado por procesos de admin o recálculo periódico.
   */
  @Post('batch-calculate')
  @ApiOperation({ summary: 'Calcular matching en lote (uso interno/admin)' })
  @ApiResponse({ status: 201 })
  async batchCalculate(@Body() dto: BatchCalculateMatchDto) {
    this.logger.log(`Batch calculate para proyecto=${dto.projectId}, students=${dto.studentIds?.length ?? 'todos'}`);
    return this.matchingService.batchCalculate(dto);
  }
}

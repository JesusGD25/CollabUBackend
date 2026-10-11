import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EvaluationService } from './evaluation.service';

@ApiTags('Evaluations Internal')
@Controller('internal/evaluations')
export class EvaluationInternalController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('application/:applicationId')
  @ApiOperation({ summary: 'Obtener evaluaciones de una postulación (interno)' })
  @ApiParam({ name: 'applicationId', type: 'string' })
  findByApplication(@Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.evaluationService.findByApplication(applicationId);
  }

  @Get('aggregate/:evaluatedId')
  @ApiOperation({ summary: 'Obtener puntuaciones agregadas de un usuario (interno)' })
  @ApiParam({ name: 'evaluatedId', type: 'string' })
  getAggregateScores(@Param('evaluatedId', ParseUUIDPipe) evaluatedId: string) {
    return this.evaluationService.getAggregateScores(evaluatedId);
  }

  @Get('analytics/stats')
  @ApiOperation({ summary: 'Obtener estadísticas pre-agregadas de evaluaciones (interno)' })
  @ApiQuery({ name: 'companyId', required: false, type: 'string' })
  @ApiQuery({ name: 'studentId', required: false, type: 'string' })
  @ApiQuery({ name: 'projectId', required: false, type: 'string' })
  @ApiQuery({ name: 'from', required: false, type: 'string' })
  @ApiQuery({ name: 'to', required: false, type: 'string' })
  getAnalyticsStats(
    @Query('companyId') companyId?: string,
    @Query('studentId') studentId?: string,
    @Query('projectId') projectId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.evaluationService.getAnalyticsStats({ companyId, studentId, projectId, from, to });
  }
}

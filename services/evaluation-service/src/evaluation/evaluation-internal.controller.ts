import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
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
}

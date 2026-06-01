import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser, UserRole } from '@collab-u/shared';

import { EvaluationService } from './evaluation.service';
import {
  CreateEvaluationDto,
  SubmitEvaluationDto,
  CreateCriterionDto,
  EvaluationQueryDto,
} from './dto';
import { EvaluationType } from './entities/enums';

@ApiTags('Evaluations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  // ──────────────────────────────────────────────────────────────────
  // EVALUACIONES
  // ──────────────────────────────────────────────────────────────────

  @Post()
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una evaluación pendiente' })
  @ApiResponse({ status: 201, description: 'Evaluación creada' })
  @ApiResponse({ status: 409, description: 'Ya existe una evaluación de este tipo' })
  create(@CurrentUser() user: any, @Body() dto: CreateEvaluationDto) {
    return this.evaluationService.createEvaluation(user.id, dto);
  }

  @Get('my/as-evaluator')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver mis evaluaciones como evaluador' })
  getMyEvaluations(@CurrentUser() user: any, @Query() query: EvaluationQueryDto) {
    return this.evaluationService.findByEvaluator(user.id, query);
  }

  @Get('my/as-evaluated')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver evaluaciones recibidas sobre mí' })
  getEvaluationsAboutMe(@CurrentUser() user: any, @Query() query: EvaluationQueryDto) {
    return this.evaluationService.findByEvaluated(user.id, query);
  }

  @Get('criteria')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver criterios de evaluación activos' })
  @ApiQuery({ name: 'evaluationType', required: false, enum: EvaluationType })
  getCriteria(@Query('evaluationType') evaluationType?: EvaluationType) {
    return this.evaluationService.getCriteria(evaluationType);
  }

  @Post('criteria')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un criterio de evaluación (admin)' })
  createCriterion(@Body() dto: CreateCriterionDto) {
    return this.evaluationService.createCriterion(dto);
  }

  @Get('templates')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver plantillas de evaluación' })
  @ApiQuery({ name: 'evaluationType', required: false, enum: EvaluationType })
  getTemplates(@Query('evaluationType') evaluationType?: EvaluationType) {
    return this.evaluationService.getTemplates(evaluationType);
  }

  @Get('aggregate/:userId')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver puntuaciones agregadas de un usuario evaluado' })
  @ApiParam({ name: 'userId', type: 'string' })
  getAggregateScores(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.evaluationService.getAggregateScores(userId);
  }

  @Get('application/:applicationId')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver evaluaciones de una postulación' })
  @ApiParam({ name: 'applicationId', type: 'string' })
  getByApplication(@Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.evaluationService.findByApplication(applicationId);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @ApiOperation({ summary: 'Ver detalle de una evaluación' })
  @ApiParam({ name: 'id', type: 'string' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.evaluationService.findById(id);
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT, UserRole.COMPANY, UserRole.FACULTY, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Completar y enviar una evaluación' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Evaluación completada' })
  @ApiResponse({ status: 403, description: 'No eres el evaluador' })
  @ApiResponse({ status: 409, description: 'Evaluación ya completada' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: SubmitEvaluationDto,
  ) {
    return this.evaluationService.submitEvaluation(id, user.id, dto);
  }
}

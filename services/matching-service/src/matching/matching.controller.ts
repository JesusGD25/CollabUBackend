import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  CurrentUser,
  UserRole,
} from '@collab-u/shared';
import { MatchingService } from './matching.service';
import {
  CalculateMatchDto,
  BatchCalculateMatchDto,
  UpdateWeightsDto,
  RecommendationQueryDto,
  SubmitFeedbackDto,
} from './dto';
import { TargetType } from './entities/enums';

@ApiTags('Matching')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  // ─── Resultados ────────────────────────────────────────────────────────────

  @Get('results/student/:studentId')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Ver resultados de matching de un estudiante' })
  @ApiResponse({ status: 200 })
  getResultsForStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.matchingService.getResultsForStudent(studentId, +page, +limit);
  }

  @Get('results/project/:projectId')
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  @ApiOperation({
    summary: 'Ver resultados de matching de un proyecto (ordenados por score)',
  })
  @ApiResponse({ status: 200 })
  getResultsForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.matchingService.getResultsForProject(projectId, +page, +limit);
  }

  @Get('results/student/:studentId/project/:projectId')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Ver resultado de matching específico estudiante-proyecto',
  })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  getSpecificResult(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.matchingService.getResultByStudentAndProject(
      studentId,
      projectId,
    );
  }

  @Get('projects/:projectId/my-match')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Ver resultado de matching específico para el estudiante actual y un proyecto',
  })
  @ApiResponse({ status: 200 })
  async getMyMatch(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: { userId: string },
  ) {
    try {
      return await this.matchingService.getResultByStudentAndProject(
        user.userId,
        projectId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @Post('calculate')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({
    summary: 'Calcular/recalcular matching para un par estudiante-proyecto (un estudiante solo puede calcular el suyo)',
  })
  @ApiResponse({ status: 201 })
  async calculate(
    @Body() dto: CalculateMatchDto,
    @CurrentUser() user: { userId: string; role: string },
  ) {
    if (user.role === UserRole.STUDENT && dto.studentId !== user.userId) {
      throw new ForbiddenException('Un estudiante solo puede calcular su propio matching');
    }
    return this.matchingService.calculateAndStore(dto.studentId, dto.projectId);
  }

  @Post('batch-calculate')
  @Roles(UserRole.ADMIN, UserRole.COMPANY)
  @ApiOperation({ summary: 'Calcular matching en lote para un proyecto' })
  @ApiResponse({ status: 201 })
  batchCalculate(@Body() dto: BatchCalculateMatchDto) {
    return this.matchingService.batchCalculate(dto);
  }

  // ─── Pesos ─────────────────────────────────────────────────────────────────

  @Get('weights')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener pesos actuales del algoritmo de matching' })
  @ApiResponse({ status: 200 })
  getWeights() {
    return this.matchingService.getWeights();
  }

  @Put('weights')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar pesos del algoritmo (deben sumar 1.0)' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Los pesos no suman 1.0' })
  updateWeights(@Body() dto: UpdateWeightsDto) {
    return this.matchingService.updateWeights(dto);
  }

  // ─── Recomendaciones ───────────────────────────────────────────────────────

  @Get('recommendations')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Ver mis recomendaciones de matching' })
  @ApiResponse({ status: 200 })
  getRecommendations(
    @CurrentUser() user: { userId: string; role: string },
    @Query() query: RecommendationQueryDto,
  ) {
    const targetType =
      user.role === 'student' ? TargetType.STUDENT : TargetType.COMPANY;
    return this.matchingService.getRecommendations(
      user.userId,
      targetType,
      query,
    );
  }

  @Patch('recommendations/:id/seen')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Marcar recomendación como vista' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  markSeen(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.matchingService.markRecommendationSeen(id, user.userId);
  }

  @Patch('recommendations/:id/dismiss')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Descartar recomendación' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  dismiss(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.matchingService.dismissRecommendation(id, user.userId);
  }

  // ─── Feedback ──────────────────────────────────────────────────────────────

  @Post('results/:matchResultId/feedback')
  @Roles(UserRole.ADMIN, UserRole.COMPANY, UserRole.STUDENT)
  @ApiOperation({ summary: 'Enviar feedback sobre un resultado de matching' })
  @ApiResponse({ status: 201 })
  @ApiResponse({
    status: 409,
    description: 'Ya enviaste feedback para este resultado',
  })
  submitFeedback(
    @Param('matchResultId', ParseUUIDPipe) matchResultId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: SubmitFeedbackDto,
  ) {
    return this.matchingService.submitFeedback(matchResultId, user.userId, dto);
  }
}

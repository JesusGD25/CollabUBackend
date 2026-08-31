import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewResolution } from '../entities/enums';

export class CompleteInterviewDto {
  @ApiPropertyOptional({ description: 'Notas del entrevistador' })
  @IsOptional()
  @IsString()
  interviewerNotes?: string;

  @ApiPropertyOptional({ description: 'Puntaje de la entrevista (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiProperty({ enum: InterviewResolution, description: 'Resolución de la empresa sobre el candidato tras esta entrevista' })
  @IsEnum(InterviewResolution)
  resolution: InterviewResolution;

  @ApiPropertyOptional({ description: 'Comentario de la empresa sobre el candidato (visible solo para la empresa)' })
  @IsOptional()
  @IsString()
  resolutionComment?: string;
}

export class CancelInterviewDto {
  @ApiPropertyOptional({ description: 'Razón de cancelación' })
  @IsOptional()
  @IsString()
  cancelledReason?: string;
}

export class RescheduleInterviewDto {
  @ApiPropertyOptional({ description: 'Nueva fecha y hora (ISO 8601)' })
  @IsString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Razón del reagendamiento' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StudentInterviewFeedbackDto {
  @ApiProperty({ description: 'Comentario del estudiante sobre la entrevista' })
  @IsString()
  studentFeedback: string;
}

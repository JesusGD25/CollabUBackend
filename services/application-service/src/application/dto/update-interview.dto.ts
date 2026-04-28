import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

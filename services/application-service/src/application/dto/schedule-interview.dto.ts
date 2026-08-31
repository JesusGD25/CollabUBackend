import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsInt,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InterviewType } from '../entities/interview.entity';

export class ScheduleInterviewDto {
  @ApiProperty({ description: 'Fecha y hora de la entrevista (ISO 8601)' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ enum: InterviewType })
  @IsEnum(InterviewType)
  interviewType: InterviewType;

  @ApiPropertyOptional({ description: 'Duración en minutos', default: 60 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(300)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Ubicación física (para entrevistas presenciales)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Enlace de videollamada, o número de contacto para entrevista telefónica' })
  @IsOptional()
  @IsString()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'UUID del entrevistador (si es diferente al usuario actual)' })
  @IsOptional()
  @IsUUID()
  interviewerId?: string;

  @ApiPropertyOptional({ description: 'Notas de la empresa al programar (guardadas como interviewerNotes)' })
  @IsOptional()
  @IsString()
  notes?: string;
}

import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsInt,
  IsUrl,
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

  @ApiPropertyOptional({ description: 'Link de la videollamada' })
  @IsOptional()
  @IsUrl()
  meetingLink?: string;

  @ApiPropertyOptional({ description: 'UUID del entrevistador (si es diferente al usuario actual)' })
  @IsOptional()
  @IsUUID('4')
  interviewerId?: string;
}

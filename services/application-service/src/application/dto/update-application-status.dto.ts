import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus } from '../entities/application.entity';

/** Estados que la empresa puede asignar manualmente */
const ALLOWED_STATUS_TRANSITIONS: ApplicationStatus[] = [
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.SHORTLISTED,
  ApplicationStatus.INTERVIEW,
  ApplicationStatus.ACCEPTED,
  ApplicationStatus.REJECTED,
  ApplicationStatus.IN_PROGRESS,
  ApplicationStatus.COMPLETED,
  ApplicationStatus.CANCELLED,
];

export class UpdateApplicationStatusDto {
  @ApiProperty({ enum: ALLOWED_STATUS_TRANSITIONS })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({ description: 'Comentario o razón del cambio' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  comment?: string;

  @ApiPropertyOptional({ description: 'Razón de rechazo (requerida si status=rejected)' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  rejectionReason?: string;
}

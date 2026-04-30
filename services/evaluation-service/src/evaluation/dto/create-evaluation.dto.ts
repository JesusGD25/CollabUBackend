import { IsUUID, IsEnum, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationType } from '../entities/enums';

export class CreateEvaluationDto {
  @ApiProperty()
  @IsUUID()
  applicationId: string;

  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  evaluatedId: string;

  @ApiProperty({ enum: EvaluationType })
  @IsEnum(EvaluationType)
  evaluationType: EvaluationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

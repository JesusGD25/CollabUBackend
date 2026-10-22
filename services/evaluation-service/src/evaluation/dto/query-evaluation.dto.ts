import { IsOptional, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EvaluationType, EvaluationStatus } from '../entities/enums';

export class EvaluationQueryDto {
  @ApiPropertyOptional({ enum: EvaluationType })
  @IsOptional()
  @IsEnum(EvaluationType)
  evaluationType?: EvaluationType;

  /** Uno o varios estados separados por coma, p. ej. `pending,in_progress`. */
  @ApiPropertyOptional({ enum: EvaluationStatus, isArray: true, example: 'pending,in_progress' })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((s) => s.trim()).filter(Boolean) : value,
  )
  @IsEnum(EvaluationStatus, { each: true })
  status?: EvaluationStatus[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

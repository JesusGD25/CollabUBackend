import { IsOptional, IsDateString, IsUUID, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MetricsQueryDto {
  @ApiPropertyOptional({ description: 'Fecha inicio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'ID de periodo académico' })
  @IsOptional()
  @IsUUID()
  periodId?: string;

  @ApiPropertyOptional({ description: 'Departamento (programa académico). Un admin de departamento siempre queda restringido al suyo.' })
  @IsOptional()
  @IsUUID()
  programId?: string;

  @ApiPropertyOptional({ enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsString()
  @IsIn(['day', 'week', 'month'])
  groupBy?: 'day' | 'week' | 'month';
}

export class SkillTrendsQueryDto extends MetricsQueryDto {
  @ApiPropertyOptional({ enum: ['language', 'framework', 'tool', 'concept', 'soft_skill'] })
  @IsOptional()
  @IsString()
  @IsIn(['language', 'framework', 'tool', 'concept', 'soft_skill'])
  category?: string;

  @ApiPropertyOptional({ description: 'Cantidad máxima de habilidades (1-200, por defecto 50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ enum: ['gap', 'demand', 'supply', 'name'], description: 'Criterio de orden (por defecto: brecha)' })
  @IsOptional()
  @IsString()
  @IsIn(['gap', 'demand', 'supply', 'name'])
  sort?: 'gap' | 'demand' | 'supply' | 'name';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ description: 'Texto a buscar en el nombre de la habilidad' })
  @IsOptional()
  @IsString()
  search?: string;
}

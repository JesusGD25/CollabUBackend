import { IsUUID, IsOptional, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BatchCalculateMatchDto {
  @ApiProperty({ description: 'ID del proyecto' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    description: 'IDs de estudiantes específicos (vacío = todos los elegibles)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @ApiPropertyOptional({ description: 'Tamaño del lote (10-1000)', default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(1000)
  batchSize?: number = 100;
}

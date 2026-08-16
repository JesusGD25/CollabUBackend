import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetInterviewBriefDto {
  @ApiPropertyOptional({ description: 'ID del archivo (Storage Service) con el enunciado de la prueba técnica' })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiPropertyOptional({ description: 'Descripción de la prueba técnica' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Fecha límite para entregar la solución (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class SetInterviewSolutionDto {
  @ApiProperty({ description: 'ID del archivo (Storage Service) con la solución del estudiante' })
  @IsUUID()
  fileId: string;
}

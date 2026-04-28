import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewDeliverableDto {
  @ApiPropertyOptional({ description: 'Feedback sobre el entregable' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Calificación del entregable (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  grade?: number;
}

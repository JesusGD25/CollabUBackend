import { IsIn, IsInt, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExtendDeadlineDto {
  @ApiProperty({ enum: ['review', 'student'], description: 'Qué plazo extender: revisión del jurado o respuesta del estudiante' })
  @IsIn(['review', 'student'])
  target: 'review' | 'student';

  @ApiProperty({ description: 'Días hábiles adicionales a partir de hoy' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  businessDays: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiProperty({ example: 'Resumen 2025-A' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: [
      'period_summary',
      'company_performance',
      'student_outcomes',
      'skill_gap_analysis',
      'matching_effectiveness',
      'custom',
    ],
  })
  @IsIn([
    'period_summary',
    'company_performance',
    'student_outcomes',
    'skill_gap_analysis',
    'matching_effectiveness',
    'custom',
  ])
  reportType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

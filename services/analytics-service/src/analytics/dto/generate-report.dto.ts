import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  IsIn,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Tipos que requieren `entityId` — reportes sobre UNA empresa/estudiante/docente puntual,
 * no un agregado de toda la plataforma. Ver PLANNING_ANALYTICS_SERVICE.md, sección de
 * rediseño de reportes (reportes específicos por entidad + descarga en PDF). */
export const ENTITY_SCOPED_REPORT_TYPES = ['company_performance', 'student_outcomes', 'supervisor_report'] as const;

export class GenerateReportDto {
  @ApiProperty({ example: 'Resumen 2025-A' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: [
      'period_summary',
      'company_performance',
      'student_outcomes',
      'supervisor_report',
      'skill_gap_analysis',
      'matching_effectiveness',
      'academic_process_summary',
      'supervisor_workload',
      'project_completion_rates',
      'custom',
    ],
  })
  @IsIn([
    'period_summary',
    'company_performance',
    'student_outcomes',
    'supervisor_report',
    'skill_gap_analysis',
    'matching_effectiveness',
    'academic_process_summary',
    'supervisor_workload',
    'project_completion_rates',
    'custom',
  ])
  reportType: string;

  @ApiPropertyOptional({
    description:
      'Requerido cuando reportType es company_performance, student_outcomes o supervisor_report — ' +
      'el userId de la empresa/estudiante, o el Supervisor.id del docente, sobre el que se genera el reporte.',
  })
  @ValidateIf((dto: GenerateReportDto) => (ENTITY_SCOPED_REPORT_TYPES as readonly string[]).includes(dto.reportType))
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  periodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

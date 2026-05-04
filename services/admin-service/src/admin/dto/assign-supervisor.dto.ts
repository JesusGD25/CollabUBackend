import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignSupervisorDto {
  @ApiProperty()
  @IsUUID()
  supervisorId: string;

  @ApiProperty()
  @IsUUID()
  studentId: string;

  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiProperty()
  @IsUUID()
  applicationId: string;

  @ApiProperty()
  @IsUUID()
  periodId: string;

  @ApiProperty({ example: '2025-02-01' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ example: '2025-06-30' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

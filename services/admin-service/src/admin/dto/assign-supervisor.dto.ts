import {
  IsOptional,
  IsString,
  IsDateString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Accepts any UUID-shaped string (8-4-4-4-12 hex), including seed/dev UUIDs
// that don't conform to RFC 4122 version/variant bits.
const UUID_FORMAT = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class AssignSupervisorDto {
  @ApiProperty()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'supervisorId must be a UUID' })
  supervisorId: string;

  @ApiProperty()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'studentId must be a UUID' })
  studentId: string;

  @ApiProperty()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'projectId must be a UUID' })
  projectId: string;

  @ApiProperty()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'applicationId must be a UUID' })
  applicationId: string;

  @ApiProperty()
  @IsString()
  @Matches(UUID_FORMAT, { message: 'periodId must be a UUID' })
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

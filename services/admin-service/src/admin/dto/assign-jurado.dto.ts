import { IsString, IsArray, IsIn, Matches, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentRole } from '../entities/supervisor-assignment.entity';

const UUID_FORMAT = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class AssignJuradoDto {
  @ApiProperty({ enum: [AssignmentRole.JURADO_FINAL] })
  @IsIn([AssignmentRole.JURADO_FINAL])
  role: AssignmentRole.JURADO_FINAL;

  @ApiProperty({ description: 'IDs de docentes (Supervisor.id) para este rol de jurado', type: [String] })
  @IsArray()
  @Matches(UUID_FORMAT, { each: true, message: 'cada juradoId debe ser un UUID' })
  juradoIds: string[];

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

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  startDate: string;
}

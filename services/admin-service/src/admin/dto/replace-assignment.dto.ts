import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const UUID_FORMAT = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class ReplaceAssignmentDto {
  @ApiProperty({ description: 'ID del nuevo docente (Supervisor.id)' })
  @IsString()
  @Matches(UUID_FORMAT, { message: 'newSupervisorId must be a UUID' })
  newSupervisorId: string;

  @ApiPropertyOptional({ description: 'Motivo del reemplazo' })
  @IsOptional()
  @IsString()
  reason?: string;
}

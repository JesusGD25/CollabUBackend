import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateMatchDto {
  @ApiProperty({ description: 'ID del estudiante', example: 'uuid' })
  @IsUUID()
  studentId: string;

  @ApiProperty({ description: 'ID del proyecto', example: 'uuid' })
  @IsUUID()
  projectId: string;
}

import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeclineAssignmentDto {
  @ApiProperty({ description: 'Motivo por el que el docente declina la asignación' })
  @IsString()
  @MinLength(5, { message: 'Debes indicar un motivo' })
  reason: string;
}

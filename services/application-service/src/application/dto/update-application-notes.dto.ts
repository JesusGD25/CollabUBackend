import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateApplicationNotesDto {
  @ApiProperty({ description: 'Nota privada de la empresa sobre el candidato (nunca visible para el estudiante)' })
  @IsString()
  notes: string;
}

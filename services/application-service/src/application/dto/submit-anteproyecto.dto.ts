import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitAnteproyectoDto {
  @ApiProperty({ description: 'ID del archivo ya subido a Storage Service' })
  @IsUUID()
  fileId: string;
}

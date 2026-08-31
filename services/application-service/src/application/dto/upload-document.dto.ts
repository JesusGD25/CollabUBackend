import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({ description: 'ID del document_requirement configurado por la Facultad' })
  @IsUUID()
  requirementId: string;

  @ApiProperty({ description: 'ID del archivo ya subido a Storage Service' })
  @IsUUID()
  fileId: string;
}

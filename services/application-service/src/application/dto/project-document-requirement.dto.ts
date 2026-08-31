import { IsArray, ArrayMinSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SelectDocumentRequirementsDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de DocumentRequirement (catálogo admin) a solicitar para este proyecto',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  requirementIds: string[];
}

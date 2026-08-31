import { IsString, IsEnum, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TemplateType } from '../entities/academic-template.entity';

export class CreateAcademicTemplateDto {
  @ApiProperty({ example: 'SIS' })
  @IsString()
  @MaxLength(20)
  programCode: string;

  @ApiProperty({ enum: TemplateType })
  @IsEnum(TemplateType)
  type: TemplateType;

  @ApiProperty({ example: 'Plantilla oficial de anteproyecto — Ing. de Sistemas' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'ID del archivo ya subido a Storage Service' })
  @IsUUID()
  fileId: string;
}

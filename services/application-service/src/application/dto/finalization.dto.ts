import { IsUUID, IsOptional, IsBoolean, IsNumber, Min, Max, IsString, MaxLength, IsArray, ValidateNested, ArrayMinSize, IsEnum, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FinalDocActorType } from '../entities/final-document-requirement.entity';

export class UploadFinalGradeDto {
  @ApiProperty({ description: 'ID del documento con la nota final, ya subido a Storage' })
  @IsUUID()
  fileId: string;

  @ApiPropertyOptional({ description: 'Nota final numérica (0-5)', minimum: 0, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  gradeValue?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;
}

export class CancelFinalizationDto {
  @ApiPropertyOptional({ description: 'Motivo de cancelación' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class FinalDocRequirementItemDto {
  @ApiProperty({ description: 'Nombre visible del documento requerido', maxLength: 200 })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Instrucciones o descripción', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: FinalDocActorType, description: 'Quién debe subir este documento' })
  @IsEnum(FinalDocActorType)
  actorType: FinalDocActorType;

  @ApiPropertyOptional({ default: true, description: 'Obligatorio para avanzar la finalización' })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}

export class StartFinalizationDto {
  @ApiProperty({
    type: [FinalDocRequirementItemDto],
    description: 'Lista de documentos requeridos para cerrar el proyecto. Al menos uno.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FinalDocRequirementItemDto)
  finalDocs: FinalDocRequirementItemDto[];
}

export class UploadFinalDocumentDto {
  @ApiProperty({ description: 'ID del FinalDocumentRequirement al que responde' })
  @IsUUID()
  finalRequirementId: string;

  @ApiProperty({ description: 'ID del archivo subido a Storage' })
  @IsUUID()
  fileId: string;
}

import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentActorType, DocumentRequiredStage } from '../entities/document-requirement.entity';

export class CreateDocumentRequirementDto {
  @ApiProperty({ example: 'Carta de aceptación empresarial' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DocumentActorType })
  @IsEnum(DocumentActorType)
  actorType: DocumentActorType;

  @ApiProperty({ enum: DocumentRequiredStage })
  @IsEnum(DocumentRequiredStage)
  requiredAtStage: DocumentRequiredStage;

  @ApiPropertyOptional({ type: [String], example: ['all'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  projectTypes?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedMimeTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxSizeBytes?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasExpiry?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ description: 'Archivo de plantilla/formato ya subido a Storage (opcional)' })
  @IsOptional()
  @IsUUID()
  templateFileId?: string;
}

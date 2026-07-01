import { IsString, IsOptional, IsUUID, IsDateString, IsArray, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DeliverableType } from '../entities/enums';

export class BulkCreateDeliverableDto {
  @ApiProperty({ description: 'Application IDs to assign this deliverable to', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  applicationIds: string[];

  @ApiProperty({ description: 'Título del entregable', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Descripción del entregable' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: DeliverableType, description: 'Tipo de entregable' })
  @IsOptional()
  @IsEnum(DeliverableType)
  type?: DeliverableType;

  @ApiPropertyOptional({ description: 'Fecha límite de entrega' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'UUID del project_deliverable (plantilla)' })
  @IsOptional()
  @IsUUID('4')
  projectDeliverableId?: string;
}
import { IsString, IsOptional, IsUUID, IsDateString, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliverableType } from '../entities/enums';

export class CreateDeliverableDto {
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

  @ApiPropertyOptional({ description: 'UUID del proyect_deliverable (plantilla)' })
  @IsOptional()
  @IsUUID()
  projectDeliverableId?: string;

  @ApiPropertyOptional({ description: 'Archivo de referencia/plantilla subido a Storage' })
  @IsOptional()
  @IsUUID()
  templateFileId?: string;
}
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  ArrayMinSize,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationType } from '../entities/conversation.entity';

export class CreateConversationDto {
  @ApiPropertyOptional({ enum: ConversationType, default: ConversationType.DIRECT })
  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @ApiPropertyOptional({ description: 'Nombre del grupo (requerido si type = group)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción del grupo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'IDs de participantes adicionales (sin incluir al creador)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];

  @ApiPropertyOptional({ description: 'ID del proyecto asociado (type = project)' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Mensaje inicial al crear la conversación' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  initialMessage?: string;
}

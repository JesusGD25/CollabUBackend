import {
  IsString, IsOptional, IsEnum, IsUUID, IsInt, IsUrl,
  MinLength, MaxLength, ValidateNested, IsArray, Min, ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../entities/message.entity';

export class MessageAttachmentDto {
  @ApiProperty({ description: 'URL de descarga del archivo (Storage Service)' })
  @IsString()
  @MaxLength(500)
  fileUrl: string;

  @ApiProperty({ description: 'Nombre visible del archivo' })
  @IsString()
  @MaxLength(255)
  fileName: string;

  @ApiPropertyOptional({ description: 'Tamaño en bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number;

  @ApiPropertyOptional({ description: 'MIME type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ description: 'URL de thumbnail (si aplica)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;
}

export class SendMessageDto {
  @ApiPropertyOptional({ enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  /**
   * Con adjuntos, el contenido puede omitirse (queda como cadena vacía) o
   * llevar un texto de acompañamiento.
   */
  @ApiProperty({ description: 'Contenido del mensaje' })
  @IsString()
  @MinLength(0)
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional({ description: 'ID del mensaje al que se responde' })
  @IsOptional()
  @IsUUID()
  replyToId?: string;

  @ApiPropertyOptional({ type: [MessageAttachmentDto], description: 'Archivos adjuntos' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

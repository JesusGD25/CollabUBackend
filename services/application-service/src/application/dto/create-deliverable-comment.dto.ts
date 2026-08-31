import { IsString, IsOptional, IsUUID, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeliverableCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ description: 'ID del comentario padre (hilo de 1 nivel)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: false, description: 'Solo admin y asesor lo verán' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  attachmentFileId?: string;
}

import { IsOptional, IsEnum, IsString, IsUUID, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FileCategory } from '../entities/stored-file.entity';

export class UploadFileDto {
  @ApiPropertyOptional({ enum: FileCategory })
  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;

  @ApiPropertyOptional({ description: 'Tipo de entidad asociada (student_profile, company, deliverable)' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'ID de la entidad asociada' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Si el archivo es público', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitDeliverableDto {
  @ApiProperty({ description: 'Título del entregable', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Descripción del entregable' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URL pública del archivo subido en Storage Service' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  /**
   * UUID del archivo en Storage Service. Se persiste junto a `fileUrl` para
   * permitir descarga segura (endpoint autenticado /storage/files/:id/download).
   * El frontend lo obtiene tras `StorageService.upload()` y lo envía junto
   * con `fileUrl`. Sin él, la descarga cae al enlace público que puede fallar
   * si el archivo es privado.
   */
  @ApiPropertyOptional({ description: 'UUID del archivo en Storage Service' })
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @ApiPropertyOptional({ description: 'UUID del entregable del proyecto al que corresponde' })
  @IsOptional()
  @IsUUID()
  projectDeliverableId?: string;
}

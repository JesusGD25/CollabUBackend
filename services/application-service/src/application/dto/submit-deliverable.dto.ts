import { IsString, IsOptional, IsUrl, IsUUID, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'URL del archivo subido en Storage Service' })
  @IsOptional()
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'UUID del entregable del proyecto al que corresponde' })
  @IsOptional()
  @IsUUID('4')
  projectDeliverableId?: string;
}

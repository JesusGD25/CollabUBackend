import { IsUUID, IsInt, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadInitiationAgreementDto {
  @ApiProperty({ description: 'ID del archivo del acuerdo firmado, ya subido a Storage' })
  @IsUUID()
  fileId: string;

  @ApiProperty({ description: 'Duración acordada en semanas' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  agreedDurationWeeks: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;
}

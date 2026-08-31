import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum JuradoReviewAction {
  CORRECTION = 'correction',
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class ReviewAnteproyectoDto {
  @ApiProperty({ enum: JuradoReviewAction })
  @IsEnum(JuradoReviewAction)
  action: JuradoReviewAction;

  @ApiPropertyOptional({ description: 'Obligatorio para correction y reject' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ description: 'PDF opcional adjunto a esta revisión (ya subido a Storage)' })
  @IsOptional()
  @IsUUID()
  fileId?: string;
}

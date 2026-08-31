import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewDocumentAction {
  APPROVE = 'approved',
  REJECT = 'rejected',
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ReviewDocumentAction })
  @IsEnum(ReviewDocumentAction)
  status: ReviewDocumentAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

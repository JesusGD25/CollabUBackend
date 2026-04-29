import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackType } from '../entities/enums';

export class SubmitFeedbackDto {
  @ApiProperty({ enum: FeedbackType })
  @IsEnum(FeedbackType)
  feedbackType: FeedbackType;

  @ApiPropertyOptional({ description: 'Comentario adicional' })
  @IsOptional()
  @IsString()
  comment?: string;
}

import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EvaluationRatingDto {
  @ApiProperty()
  @IsUUID()
  criterionId: string;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}

export class SubmitEvaluationDto {
  @ApiProperty({ type: [EvaluationRatingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvaluationRatingDto)
  ratings: EvaluationRatingDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  overallScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  overallComment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strengths?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  areasForImprovement?: string;
}

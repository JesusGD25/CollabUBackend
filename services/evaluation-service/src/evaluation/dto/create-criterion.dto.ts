import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CriterionCategory, EvaluationType, RatingScale } from '../entities/enums';

export class CreateCriterionDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: CriterionCategory })
  @IsEnum(CriterionCategory)
  category: CriterionCategory;

  @ApiProperty({ enum: EvaluationType })
  @IsEnum(EvaluationType)
  evaluationType: EvaluationType;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  weight?: number;

  @ApiPropertyOptional({ enum: RatingScale })
  @IsOptional()
  @IsEnum(RatingScale)
  ratingScale?: RatingScale;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

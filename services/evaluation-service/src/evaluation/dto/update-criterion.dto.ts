import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CriterionCategory, EvaluationType, RatingScale } from '../entities/enums';

export class UpdateCriterionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CriterionCategory })
  @IsOptional()
  @IsEnum(CriterionCategory)
  category?: CriterionCategory;

  @ApiPropertyOptional({ enum: EvaluationType })
  @IsOptional()
  @IsEnum(EvaluationType)
  evaluationType?: EvaluationType;

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
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

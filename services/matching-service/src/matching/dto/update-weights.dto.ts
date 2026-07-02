import { IsArray, ValidateNested, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { MatchFactor } from '../entities/enums';

export class WeightItemDto {
  @ApiProperty({ enum: MatchFactor })
  @IsEnum(MatchFactor)
  factorName: MatchFactor;

  @ApiProperty({ minimum: 0, maximum: 1, example: 0.35 })
  @IsNumber()
  @Min(0)
  @Max(1)
  weight: number;
}

export class UpdateWeightsDto {
  @ApiProperty({ type: [WeightItemDto], description: 'Los pesos deben sumar 1.0' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WeightItemDto)
  weights: WeightItemDto[];
}

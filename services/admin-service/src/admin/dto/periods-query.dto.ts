import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PeriodStatus } from '../entities/academic-period.entity';

export class PeriodsQueryDto {
  @ApiPropertyOptional({ enum: PeriodStatus })
  @IsOptional()
  @IsEnum(PeriodStatus)
  status?: PeriodStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCurrent?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusinessAreaDto {
  @ApiProperty({ example: 'Desarrollo Web' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  areaName: string;

  @ApiPropertyOptional({ example: 'Desarrollo de aplicaciones web modernas' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

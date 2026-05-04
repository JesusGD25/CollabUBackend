import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAcademicProgramDto {
  @ApiProperty({ example: 'Ingeniería de Sistemas' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'ISC' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ default: 'Facultad de Ingeniería' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  faculty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalSemesters?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requiresInternship?: boolean;

  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumSemesterForInternship?: number;
}

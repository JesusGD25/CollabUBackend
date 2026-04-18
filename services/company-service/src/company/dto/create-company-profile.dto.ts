import {
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompanySize } from '../entities/company-profile.entity';

export class CreateCompanyProfileDto {
  userId: string; // Inyectado por el controller desde el JWT

  @ApiProperty({ example: 'Tech Solutions SAS', minLength: 2, maxLength: 200 })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  companyName: string;

  @ApiPropertyOptional({ example: 'Tech Solutions SAS' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  nit?: string;

  @ApiPropertyOptional({ example: 'Tecnología' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({ enum: CompanySize, example: CompanySize.SMALL })
  @IsOptional()
  @IsEnum(CompanySize)
  companySize?: CompanySize;

  @ApiPropertyOptional({ example: 'Empresa de desarrollo de software' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://techsolutions.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear())
  foundedYear?: number;

  @ApiPropertyOptional({ example: 'Pasto' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  headquartersCity?: string;

  @ApiPropertyOptional({ example: 'Nariño' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  headquartersState?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  employeeCount?: number;
}

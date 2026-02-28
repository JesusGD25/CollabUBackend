import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'Juan' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Pérez' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+573001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '+57' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  phoneCountryCode?: string;

  @ApiPropertyOptional({ example: '2000-01-15' })
  @IsOptional()
  @IsDateString({}, { message: 'Debe ser una fecha válida en formato ISO 8601' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'masculino' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @ApiPropertyOptional({ example: 'Estudiante de ingeniería de sistemas' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: 'Pasto' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'Nariño' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'Calle 18 #25-30' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'https://mi-sitio.com' })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @MaxLength(500)
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/juan-perez' })
  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida de LinkedIn' })
  @MaxLength(500)
  linkedinUrl?: string;
}

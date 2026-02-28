import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserProfileDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'user_id debe ser un UUID v4 válido' })
  userId: string;

  @ApiProperty({ example: 'student' })
  @IsString()
  @IsNotEmpty({ message: 'El rol es requerido' })
  role: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(100)
  lastName: string;

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
}

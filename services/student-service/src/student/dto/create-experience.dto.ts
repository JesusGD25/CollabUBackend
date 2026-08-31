import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ExperienceType } from '../entities/experience.entity';

export class CreateExperienceDto {
  @IsEnum(ExperienceType, {
    message: 'El tipo debe ser: work, internship, volunteer, academic o freelance',
  })
  type: ExperienceType;

  @IsString()
  @IsNotEmpty({ message: 'El título es requerido' })
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  responsibilities?: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida ISO 8601' })
  startDate: string;

  @IsOptional()
  @ValidateIf((o) => o.isCurrent !== true)
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida ISO 8601' })
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  workMode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technologiesUsed?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

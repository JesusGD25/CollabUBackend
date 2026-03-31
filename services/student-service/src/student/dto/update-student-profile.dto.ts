import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentAvailability } from '../entities/student-profile.entity';

export class UpdateStudentProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  program?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  faculty?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(16)
  semester?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  studentCode?: string;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  enrollmentYear?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  expectedGraduationYear?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5.0)
  gpa?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCreditsCompleted?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalCreditsRequired?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  headline?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @MaxLength(500)
  cvUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @MaxLength(500)
  portfolioUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida de GitHub' })
  @MaxLength(500)
  githubUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  @MaxLength(500)
  personalWebsiteUrl?: string;

  @IsOptional()
  @IsEnum(StudentAvailability, {
    message: 'Disponibilidad debe ser: full_time, part_time, flexible o unavailable',
  })
  availability?: StudentAvailability;

  @IsOptional()
  @IsString()
  preferredWorkMode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(48)
  availableHoursPerWeek?: number;

  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

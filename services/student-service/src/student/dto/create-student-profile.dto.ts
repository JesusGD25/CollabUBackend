import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { StudentAvailability } from '../entities/student-profile.entity';

export class CreateStudentProfileDto {
  @IsUUID('4', { message: 'user_id debe ser un UUID v4 válido' })
  userId: string;

  @IsString()
  @IsNotEmpty({ message: 'El programa es requerido' })
  @MaxLength(150)
  program: string;

  /** Opcional durante la transición: si se envía, debe existir en admin_service.academic_programs. */
  @IsOptional()
  @IsUUID('4', { message: 'programId debe ser un UUID v4 válido' })
  programId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  faculty?: string;

  @IsInt()
  @Min(1, { message: 'El semestre mínimo es 1' })
  @Max(16, { message: 'El semestre máximo es 16' })
  semester: number;

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
  @Max(5.0, { message: 'El GPA máximo es 5.0' })
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
}

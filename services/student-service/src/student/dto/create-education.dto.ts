import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateEducationDto {
  @IsString()
  @IsNotEmpty({ message: 'La institución es requerida' })
  @MaxLength(200)
  institution: string;

  @IsString()
  @IsNotEmpty({ message: 'El título/grado es requerido' })
  @MaxLength(150)
  degree: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  fieldOfStudy?: string;

  @IsOptional()
  @IsString()
  description?: string;

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
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(5.0, { message: 'El GPA máximo es 5.0' })
  gpa?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thesisTitle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

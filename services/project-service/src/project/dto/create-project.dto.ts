import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  MinLength,
  IsNumber,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProjectType,
  LocationType,
  CompensationType,
} from '../entities/project.entity';
import { CreateProjectSkillDto } from './create-project-skill.dto';

export class CreateProjectDto {
  @IsString()
  @MinLength(10)
  title: string;

  @IsString()
  @MinLength(50)
  description: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  durationMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  weeklyHours?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalHours?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(CompensationType)
  compensationType?: CompensationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  compensationAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  positionsAvailable?: number;

  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  academicPrograms?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  minimumSemester?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectSkillDto)
  skills?: CreateProjectSkillDto[];

  @IsOptional()
  @IsUUID()
  requestDocumentFileId?: string;
}

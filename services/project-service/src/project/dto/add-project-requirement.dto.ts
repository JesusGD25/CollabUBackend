import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { RequirementType } from '../entities/project-requirement.entity';

export class AddProjectRequirementDto {
  @IsEnum(RequirementType)
  requirementType: RequirementType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsString()
  proficiencyLevel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

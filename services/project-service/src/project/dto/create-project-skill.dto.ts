import { IsString, IsOptional, IsEnum, IsBoolean, IsInt, IsUUID, Min, MaxLength } from 'class-validator';
import { SkillCategory, ProficiencyLevel } from '../entities/project-skill.entity';

export class CreateProjectSkillDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsUUID()
  catalogSkillId?: string;

  @IsEnum(SkillCategory)
  category: SkillCategory;

  @IsOptional()
  @IsEnum(ProficiencyLevel)
  proficiencyLevel?: ProficiencyLevel;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

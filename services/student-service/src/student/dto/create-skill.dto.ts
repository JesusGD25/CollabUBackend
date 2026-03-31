import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SkillCategory, ProficiencyLevel } from '../entities/skill.entity';

export class CreateSkillDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la habilidad es requerido' })
  @MaxLength(100)
  name: string;

  @IsEnum(SkillCategory, {
    message: 'La categoría debe ser: technical, soft, language o tool',
  })
  category: SkillCategory;

  @IsOptional()
  @IsEnum(ProficiencyLevel, {
    message: 'El nivel debe ser: beginner, intermediate, advanced o expert',
  })
  proficiencyLevel?: ProficiencyLevel;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

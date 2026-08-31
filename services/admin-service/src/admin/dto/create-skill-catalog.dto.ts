import { IsString, IsOptional, IsEnum, MaxLength, IsArray, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillCategory } from '../entities/skill-catalog.entity';

export class CreateSkillCatalogDto {
  @ApiProperty({ example: 'React' })
  @IsString()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({ enum: SkillCategory })
  @IsEnum(SkillCategory)
  category: SkillCategory;

  @ApiPropertyOptional({ type: [String], description: 'IDs de programas académicos a asociar' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  programIds?: string[];
}

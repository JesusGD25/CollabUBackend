import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateSkillCatalogDto } from './create-skill-catalog.dto';

export class UpdateSkillCatalogDto extends PartialType(OmitType(CreateSkillCatalogDto, ['programIds'] as const)) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

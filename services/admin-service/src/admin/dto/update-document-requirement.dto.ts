import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateDocumentRequirementDto } from './create-document-requirement.dto';

export class UpdateDocumentRequirementDto extends PartialType(
  OmitType(CreateDocumentRequirementDto, ['actorType', 'requiredAtStage'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

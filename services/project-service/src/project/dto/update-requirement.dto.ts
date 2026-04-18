import { PartialType } from '@nestjs/mapped-types';
import { AddProjectRequirementDto } from './add-project-requirement.dto';

export class UpdateRequirementDto extends PartialType(AddProjectRequirementDto) {}

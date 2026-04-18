import { PartialType } from '@nestjs/mapped-types';
import { AddProjectDeliverableDto } from './add-project-deliverable.dto';

export class UpdateDeliverableDto extends PartialType(AddProjectDeliverableDto) {}

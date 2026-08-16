import { PartialType } from '@nestjs/swagger';
import { CreateRejectionCategoryDto } from './create-rejection-category.dto';

export class UpdateRejectionCategoryDto extends PartialType(CreateRejectionCategoryDto) {}

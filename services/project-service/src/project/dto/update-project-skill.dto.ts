import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectSkillDto } from './create-project-skill.dto';

export class UpdateProjectSkillDto extends PartialType(CreateProjectSkillDto) {}

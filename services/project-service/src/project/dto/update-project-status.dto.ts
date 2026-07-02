import { IsEnum } from 'class-validator';
import { ProjectStatus } from '../entities/project.entity';

export class UpdateProjectStatusDto {
  @IsEnum(ProjectStatus)
  status: ProjectStatus;
}

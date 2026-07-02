import { PartialType } from '@nestjs/mapped-types';
import { CreateActivityDto } from './create-activity.dto';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ActivityStatus } from '../entities/project-activity.entity';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @IsOptional()
  hoursActual?: number;
}

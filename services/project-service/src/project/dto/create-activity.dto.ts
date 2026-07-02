import {
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ActivityPriority } from '../entities/project-activity.entity';

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  activityType: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  @IsOptional()
  hoursEstimated?: number;
}

import {
  IsOptional,
  IsBoolean,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  applicationUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  interviewReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  evaluationAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  matchRecommendations?: boolean;

  @IsOptional()
  @IsBoolean()
  projectUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  chatMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  systemAnnouncements?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  quietHoursStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  quietHoursEnd?: string;
}

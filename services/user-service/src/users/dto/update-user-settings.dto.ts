import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UiTheme, UiLanguage, ProfileVisibility } from '../entities/user-settings.entity';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ enum: UiTheme, example: UiTheme.DARK })
  @IsOptional()
  @IsEnum(UiTheme, { message: 'El tema debe ser: light, dark o system' })
  theme?: UiTheme;

  @ApiPropertyOptional({ enum: UiLanguage, example: UiLanguage.ES })
  @IsOptional()
  @IsEnum(UiLanguage, { message: 'El idioma debe ser: es o en' })
  language?: UiLanguage;

  @ApiPropertyOptional({ enum: ProfileVisibility, example: ProfileVisibility.REGISTERED })
  @IsOptional()
  @IsEnum(ProfileVisibility, {
    message: 'La visibilidad debe ser: public, registered o private',
  })
  profileVisibility?: ProfileVisibility;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  applicationUpdates?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  newMatches?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  evaluationReminders?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ example: 'DD/MM/YYYY' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dateFormat?: string;
}

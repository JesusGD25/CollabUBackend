import { Expose, Type } from 'class-transformer';

export class UserSettingsResponseDto {
  @Expose()
  theme: string;

  @Expose()
  language: string;

  @Expose()
  profileVisibility: string;

  @Expose()
  emailNotifications: boolean;

  @Expose()
  pushNotifications: boolean;

  @Expose()
  applicationUpdates: boolean;

  @Expose()
  newMatches: boolean;

  @Expose()
  messages: boolean;

  @Expose()
  evaluationReminders: boolean;

  @Expose()
  marketingEmails: boolean;

  @Expose()
  timezone: string;

  @Expose()
  dateFormat: string;
}

export class UserProfileResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  role: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  phone: string | null;

  @Expose()
  phoneCountryCode: string | null;

  @Expose()
  avatarUrl: string | null;

  @Expose()
  dateOfBirth: Date | null;

  @Expose()
  gender: string | null;

  @Expose()
  bio: string | null;

  @Expose()
  city: string | null;

  @Expose()
  department: string | null;

  @Expose()
  country: string;

  @Expose()
  address: string | null;

  @Expose()
  websiteUrl: string | null;

  @Expose()
  linkedinUrl: string | null;

  @Expose()
  profileCompleteness: number;

  @Expose()
  isOnboardingComplete: boolean;

  @Expose()
  lastActiveAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => UserSettingsResponseDto)
  settings: UserSettingsResponseDto;
}

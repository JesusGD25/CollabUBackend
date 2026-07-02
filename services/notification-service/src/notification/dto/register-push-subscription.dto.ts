import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DeviceType } from '../entities/push-subscription.entity';

export class RegisterPushSubscriptionDto {
  @IsString()
  endpoint: string;

  @IsOptional()
  @IsString()
  p256dh?: string;

  @IsOptional()
  @IsString()
  auth?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  deviceType?: DeviceType;

  @IsOptional()
  @IsString()
  deviceName?: string;
}

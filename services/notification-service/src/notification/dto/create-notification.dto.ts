import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsObject,
  IsBoolean,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from '../entities/notification.entity';

export class CreateNotificationDto {
  @IsUUID()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  groupKey?: string;

  /** Fuerza el envío por email aunque el usuario no tenga habilitada la categoría en sus preferencias.
   *  Uso: eventos críticos institucionales (aprobación/rechazo de proyecto, plazos, acuerdos, finalización). */
  @IsOptional()
  @IsBoolean()
  forceEmail?: boolean;
}

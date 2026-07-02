import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Notification } from '../notification/entities/notification.entity';
import { NotificationPreferences } from '../notification/entities/notification-preferences.entity';
import { EmailQueue } from '../notification/entities/email-queue.entity';
import { NotificationTemplate } from '../notification/entities/notification-template.entity';
import { PushSubscription } from '../notification/entities/push-subscription.entity';

export function databaseConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5435', 10),
    username: process.env.DB_USERNAME || 'collabu_admin',
    password: process.env.DB_PASSWORD || 'collabu_secret_2025',
    database: process.env.DB_NAME || 'notification_db',
    entities: [
      Notification,
      NotificationPreferences,
      EmailQueue,
      NotificationTemplate,
      PushSubscription,
    ],
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',
  };
}

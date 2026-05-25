import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { EmailQueue } from './entities/email-queue.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { PushSubscription } from './entities/push-subscription.entity';

import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationInternalController } from './notification-internal.controller';
import { NotificationGateway } from './notification.gateway';
import { EventPublisher } from '@collab-u/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationPreferences,
      EmailQueue,
      NotificationTemplate,
      PushSubscription,
    ]),
  ],
  controllers: [NotificationController, NotificationInternalController],
  providers: [NotificationService, EventPublisher, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}

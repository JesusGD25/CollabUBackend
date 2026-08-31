import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import { MicroserviceHttpClient } from '@collab-u/shared';

import { Notification } from './entities/notification.entity';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { EmailQueue } from './entities/email-queue.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { PushSubscription } from './entities/push-subscription.entity';

import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationInternalController } from './notification-internal.controller';
import { NotificationGateway } from './notification.gateway';
import { MailerService } from './mailer.service';
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
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'collabu-jwt-super-secret-key-change-in-production-2025',
        signOptions: {
          expiresIn: configService.get<any>('JWT_EXPIRATION', '3600s'),
        },
      }),
    }),
  ],
  controllers: [NotificationController, NotificationInternalController],
  providers: [
    NotificationService,
    EventPublisher,
    NotificationGateway,
    MailerService,
    {
      provide: MicroserviceHttpClient,
      useFactory: (httpService: HttpService) => new MicroserviceHttpClient(httpService as any),
      inject: [HttpService],
    },
  ],
  exports: [NotificationService, NotificationGateway, MicroserviceHttpClient],
})
export class NotificationModule {}

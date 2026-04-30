import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@collab-u/shared';

import { databaseConfig } from './config/database.config';
import { NotificationModule } from './notification/notification.module';
import { NotificationSubscriber } from './notification/notification.subscriber';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [NotificationSubscriber],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@collab-u/shared';

import { databaseConfig } from './config/database.config';
import { ApplicationModule } from './application/application.module';
import { HealthController } from './health/health.controller';
import { ApplicationEventsSubscriber } from './application/application-events.subscriber';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    ApplicationModule,
  ],
  controllers: [HealthController],
  providers: [ApplicationEventsSubscriber],
})
export class AppModule {}

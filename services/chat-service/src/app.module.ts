import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@collab-u/shared';

import { databaseConfig } from './config/database.config';
import { ChatModule } from './chat/chat.module';
import { ChatEventsSubscriber } from './chat/chat-events.subscriber';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    ChatModule,
  ],
  controllers: [HealthController],
  providers: [ChatEventsSubscriber],
})
export class AppModule {}

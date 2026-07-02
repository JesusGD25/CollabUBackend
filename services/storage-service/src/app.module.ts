import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { StorageModule } from './storage/storage.module';
import { HealthController } from './health/health.controller';
import { StorageEventsSubscriber } from './events/storage-events.subscriber';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    StorageModule,
  ],
  controllers: [HealthController],
  providers: [StorageEventsSubscriber],
})
export class AppModule {}

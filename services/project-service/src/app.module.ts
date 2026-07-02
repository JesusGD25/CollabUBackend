import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { ProjectModule } from './project/project.module';
import { HealthController } from './health/health.controller';
import { ProjectEventsSubscriber } from './events/project-events.subscriber';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    ProjectModule,
  ],
  controllers: [HealthController],
  providers: [ProjectEventsSubscriber],
})
export class AppModule {}

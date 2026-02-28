import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { UsersModule } from './users/users.module';
import { HealthController } from './health/health.controller';
import { UserEventsSubscriber } from './events/user-events.subscriber';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [UserEventsSubscriber],
})
export class AppModule {}

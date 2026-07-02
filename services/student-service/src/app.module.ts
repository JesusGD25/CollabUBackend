import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { StudentModule } from './student/student.module';
import { HealthController } from './health/health.controller';
import { StudentEventsSubscriber } from './events/student-events.subscriber';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    StudentModule,
  ],
  controllers: [HealthController],
  providers: [StudentEventsSubscriber],
})
export class AppModule {}

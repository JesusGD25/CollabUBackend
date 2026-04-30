import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { EvaluationModule } from './evaluation/evaluation.module';
import { HealthController } from './health/health.controller';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    EvaluationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

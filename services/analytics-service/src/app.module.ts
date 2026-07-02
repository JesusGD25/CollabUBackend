import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@collab-u/shared';
import { databaseConfig } from './config/database.config';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    AnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { CompanyModule } from './company/company.module';
import { HealthController } from './health/health.controller';
import { CompanyEventsSubscriber } from './events/company-events.subscriber';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    CompanyModule,
  ],
  controllers: [HealthController],
  providers: [CompanyEventsSubscriber],
})
export class AppModule {}

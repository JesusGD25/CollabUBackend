import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { MatchingModule } from './matching/matching.module';
import { HealthController } from './health/health.controller';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    MatchingModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}


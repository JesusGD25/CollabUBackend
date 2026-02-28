import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { RabbitMQModule } from '@collab-u/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseConfig()),
    RabbitMQModule.forRoot(),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

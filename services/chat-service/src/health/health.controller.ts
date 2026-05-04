import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    const dbConnected = this.dataSource.isInitialized;
    return {
      status: 'ok',
      service: 'chat-service',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }
}

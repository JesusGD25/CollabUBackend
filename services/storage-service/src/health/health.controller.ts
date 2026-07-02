import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check del Storage Service' })
  check() {
    return {
      status: 'ok',
      service: 'storage-service',
      timestamp: new Date().toISOString(),
    };
  }
}

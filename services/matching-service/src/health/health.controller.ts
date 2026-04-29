import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check del Matching Service' })
  check() {
    return {
      status: 'ok',
      service: 'matching-service',
      timestamp: new Date().toISOString(),
    };
  }
}

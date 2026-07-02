import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check del Student Service' })
  check() {
    return {
      status: 'ok',
      service: 'student-service',
      timestamp: new Date().toISOString(),
    };
  }
}

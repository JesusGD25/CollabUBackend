import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_ROUTES } from '../config/gateway.config';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly httpService: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'Health check del API Gateway y servicios downstream' })
  async check() {
    const services: Record<string, string> = {};

    // Verificar solo auth y user por ahora (Sprint 1)
    const servicesToCheck = ['auth', 'users'];

    for (const name of servicesToCheck) {
      const route = GATEWAY_ROUTES[name];
      if (!route) continue;

      try {
        await firstValueFrom(
          this.httpService.get(`${route.target}/health`, { timeout: 3000 }),
        );
        services[name] = 'ok';
      } catch {
        services[name] = 'unavailable';
      }
    }

    return {
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      downstream: services,
    };
  }
}

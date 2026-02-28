import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthController } from './health/health.controller';
import { GatewayAuthMiddleware } from './middleware/auth.middleware';
import { ProxyMiddleware } from './proxy/proxy.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 3,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 1. Auth middleware — valida JWT y agrega headers x-user-*
    consumer
      .apply(GatewayAuthMiddleware)
      .forRoutes({ path: 'api/v1/*path', method: RequestMethod.ALL });

    // 2. Proxy middleware — reenvía peticiones a servicios downstream
    consumer
      .apply(ProxyMiddleware)
      .forRoutes({ path: 'api/v1/*path', method: RequestMethod.ALL });
  }
}

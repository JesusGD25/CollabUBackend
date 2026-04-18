import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response, NextFunction } from 'express';
import { firstValueFrom } from 'rxjs';
import { GATEWAY_ROUTES } from '../config/gateway.config';

@Injectable()
export class GatewayAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GatewayAuthMiddleware.name);

  constructor(private readonly httpService: HttpService) {}

  // Rutas que NO requieren autenticación
  private readonly publicRoutes: string[] = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/verify-email',
    '/api/v1/auth/resend-verification-email',
    '/api/v1/auth/forgot-password',
    '/api/v1/auth/reset-password',
    '/api/v1/auth/refresh',
    '/api/v1/auth/validate',
  ];

  // Rutas que son públicas con método GET
  private readonly publicGetRoutes: RegExp[] = [
    /^\/api\/v1\/projects(\/[a-f0-9-]+)?$/,
    /^\/api\/v1\/evaluations\/company\/[a-f0-9-]+$/,
    /^\/api\/v1\/evaluations\/student\/[a-f0-9-]+$/,
    /^\/api\/v1\/evaluations\/criteria$/,
  ];

  async use(req: Request, res: Response, next: NextFunction) {
    // Health check — siempre público
    if (req.path === '/health' || req.path.startsWith('/api/docs')) {
      return next();
    }

    // Permitir rutas completamente públicas
    if (this.publicRoutes.some((route) => req.path.startsWith(route))) {
      return next();
    }

    // Permitir rutas públicas solo con GET
    if (req.method === 'GET' && this.publicGetRoutes.some((regex) => regex.test(req.path))) {
      return next();
    }

    // Verificar token JWT
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Token de autenticación requerido',
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      // Validar token con Auth Service
      const response = await firstValueFrom(
        this.httpService.post(
          `${GATEWAY_ROUTES.auth.target}/internal/auth/validate`,
          { token },
          { timeout: 5000 },
        ),
      );

      // Inyectar información del usuario en headers para servicios downstream
      req.headers['x-user-id'] = response.data.id;
      req.headers['x-user-email'] = response.data.email;
      req.headers['x-user-role'] = response.data.role;

      next();
    } catch (error: any) {
      this.logger.warn(`Token inválido: ${error.message}`);
      return res.status(401).json({
        statusCode: 401,
        message: 'Token inválido o expirado',
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }
  }
}

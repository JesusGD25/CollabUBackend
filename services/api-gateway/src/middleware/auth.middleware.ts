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

  // Rutas que son publicas con metodo GET
  private readonly publicGetRoutes: RegExp[] = [
    /^\/api\/v1\/projects(\/[a-f0-9-]+)?$/,
    /^\/api\/v1\/evaluations\/company\/[a-f0-9-]+$/,
    /^\/api\/v1\/evaluations\/student\/[a-f0-9-]+$/,
    /^\/api\/v1\/evaluations\/criteria$/,
    // La descarga de archivos NO es pública: los documentos académicos, entregables
    // y adjuntos de entrevista requieren autenticación y comprobación de rol dentro
    // del proyecto. Sin cabecera, `userId` llegaba nulo y la comprobación de acceso
    // no podía ejecutarse.
  ];

  async use(req: Request, res: Response, next: NextFunction) {
    if (req.path === '/health' || req.path.startsWith('/api/docs')) {
      return next();
    }

    const isPublicRoute = this.publicRoutes.some((route) => req.path.startsWith(route)) || (req.method === 'GET' && this.publicGetRoutes.some((regex) => regex.test(req.path)));

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isPublicRoute) return next();
      return res.status(401).json({
        statusCode: 401,
        message: 'Token de autenticacion requerido',
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${GATEWAY_ROUTES.auth.target}/internal/auth/validate`,
          { token },
          { timeout: 5000 },
        ),
      );

      req.headers['x-user-id'] = response.data.id;
      req.headers['x-user-email'] = response.data.email;
      req.headers['x-user-role'] = response.data.role;

      next();
    } catch (error: any) {
      this.logger.warn(`Token invalido: ${error.message}`);
      if (isPublicRoute) return next();
      return res.status(401).json({
        statusCode: 401,
        message: 'Token invalido o expirado',
        error: 'Unauthorized',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { GATEWAY_ROUTES } from '../config/gateway.config';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);
  private readonly proxies: Map<string, RequestHandler> = new Map();

  constructor() {
    // Crear proxy handlers para cada servicio
    for (const [name, route] of Object.entries(GATEWAY_ROUTES)) {
      const proxy = createProxyMiddleware({
        target: route.target,
        changeOrigin: route.changeOrigin,
        pathRewrite: undefined, // Mantener paths como están
        on: {
          proxyReq: (proxyReq, req: any) => {
            // Propagar headers de autenticación al servicio downstream
            if (req.headers['x-user-id']) {
              proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
            }
            if (req.headers['x-user-email']) {
              proxyReq.setHeader('x-user-email', req.headers['x-user-email']);
            }
            if (req.headers['x-user-role']) {
              proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
            }

            // Re-serializar el body si ya fue parseado por Express
            if (req.body && Object.keys(req.body).length > 0) {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          },
          proxyRes: (proxyRes, req: any) => {
            this.logger.debug(
              `Proxy ${req.method} ${req.url} → ${route.target} [${proxyRes.statusCode}]`,
            );
          },
          error: (err, req: any, res: any) => {
            this.logger.error(`Proxy error ${req.method} ${req.url}: ${err.message}`);
            if (!res.headersSent) {
              res.status(502).json({
                statusCode: 502,
                message: `Servicio ${name} no disponible`,
                error: 'Bad Gateway',
                timestamp: new Date().toISOString(),
              });
            }
          },
        },
      });
      this.proxies.set(route.pathPrefix, proxy);
    }
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Encontrar el proxy correspondiente según el path
    for (const [prefix, proxy] of this.proxies) {
      if (req.path.startsWith(prefix)) {
        return proxy(req, res, next);
      }
    }

    // Si no hay proxy para esta ruta, continuar al siguiente middleware
    next();
  }
}

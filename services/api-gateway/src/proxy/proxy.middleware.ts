import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, RequestHandler } from 'http-proxy-middleware';
import { GATEWAY_ROUTES } from '../config/gateway.config';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const httpProxy = require('http-proxy');

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ProxyMiddleware.name);
  private readonly proxies: Map<string, RequestHandler> = new Map();

  // Proxies dedicados para upgrades de WebSocket (http-proxy directo)
  private readonly wsProxies: Map<string, any> = new Map();

  constructor() {
    for (const [name, route] of Object.entries(GATEWAY_ROUTES)) {
      // ─── Proxy HTTP (sin ws: true para evitar auto-suscripción al upgrade) ───
      const proxy = createProxyMiddleware({
        target: route.target,
        changeOrigin: route.changeOrigin,
        // ws deshabilitado: los upgrades de WebSocket se manejan
        // aparte con http-proxy directo en handleUpgrade()
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

            // Re-serializar el body si ya fue parseado por Express y no es multipart/form-data
            const contentType = req.headers['content-type'] || '';
            const isMultipart = contentType.includes('multipart/form-data');

            if (req.body && Object.keys(req.body).length > 0 && !isMultipart) {
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

            if (res && typeof res.status === 'function') {
              if (!res.headersSent) {
                res.status(502).json({
                  statusCode: 502,
                  message: `Servicio ${name} no disponible`,
                  error: 'Bad Gateway',
                  timestamp: new Date().toISOString(),
                });
              }
            }
          },
        },
      });
      this.proxies.set(route.pathPrefix, proxy);

      // ─── Proxy WS dedicado (solo para rutas /ws/*) ───
      if (route.pathPrefix.startsWith('/ws/')) {
        const wsProxy = httpProxy.createProxyServer({
          target: route.target,
          ws: true,
          changeOrigin: true,
        });

        wsProxy.on('error', (err: any, req: any, socket: any) => {
          this.logger.error(`WS proxy error [${name}] ${req?.url}: ${err.message}`);
          if (socket && !socket.destroyed && typeof socket.destroy === 'function') {
            socket.destroy();
          }
        });

        this.wsProxies.set(route.pathPrefix, wsProxy);
        this.logger.log(`WS proxy creado para: ${route.pathPrefix} → ${route.target}`);
      }
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

  /**
   * Maneja upgrades de WebSocket directamente sobre el socket TCP,
   * utilizando http-proxy para una conexión limpia sin pasar
   * por el pipeline HTTP de NestJS.
   */
  handleUpgrade(req: any, socket: any, head: any) {
    const url: string = req.url || '';

    for (const [prefix, wsProxy] of this.wsProxies) {
      if (url.startsWith(prefix)) {
        this.logger.log(`WS upgrade → ${prefix}`);
        wsProxy.ws(req, socket, head);
        return;
      }
    }

    this.logger.warn(`WS upgrade sin proxy configurado: ${url}`);
    socket.destroy();
  }
}

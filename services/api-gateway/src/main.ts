import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GatewayLoggingInterceptor } from './interceptors/logging.interceptor';
import { ProxyMiddleware } from './proxy/proxy.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Aumentar el límite de listeners para evitar MaxListenersExceededWarning
  // Especialmente útil cuando muchos servicios pasan por el proxy
  process.setMaxListeners(20);

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'https://collab-u.udenar.edu.co',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['X-Total-Count', 'Content-Disposition'],
    maxAge: 3600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new GatewayLoggingInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Collab-U API Gateway')
    .setDescription('API Gateway — Punto de entrada principal')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  const server = await app.listen(port);

  // Manejar upgrades de WebSockets para el proxy
  const proxyMiddleware = app.get(ProxyMiddleware);
  server.on('upgrade', (req: any, socket: any, head: any) => {
    proxyMiddleware.handleUpgrade(req, socket, head);
  });

  console.log(`API Gateway corriendo en puerto ${port}`);
}
bootstrap();

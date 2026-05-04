import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalHttpExceptionFilter } from '@collab-u/shared';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Filtro global de excepciones
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Collab-U Chat Service')
    .setDescription('Servicio de mensajería en tiempo real: conversaciones, mensajes y reacciones')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Puerto
  const port = process.env.PORT ?? 3010;
  await app.listen(port);
  console.log(`Chat Service corriendo en http://localhost:${port}/api/v1`);
  console.log(`Swagger docs en http://localhost:${port}/api/docs`);
}
void bootstrap();

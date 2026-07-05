import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Permite que el frontend web (Angular) consuma la API desde otro origen.
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: () =>
        new BadRequestException({
          codigoEstado: 400,
          mensaje: 'Campos obligatorios faltantes o inválidos',
        }),
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

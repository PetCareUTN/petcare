import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Permite que el frontend web (Angular) consuma la API desde otro origen.
  // Acepta varios origenes separados por coma: en produccion conviven el
  // dominio propio y el que asigna Vercel, y en staging ademas los previews.
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
      .split(',')
      .map((origen) => origen.trim())
      .filter((origen) => origen.length > 0),
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
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

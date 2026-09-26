import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Permite que el frontend web (Angular) consuma la API desde otro origen.
  // CORS_ORIGIN admite varios orígenes separados por coma, p. ej. para usar
  // localhost y un túnel (ngrok) al mismo tiempo.
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
  // Solo las fotos de mascotas son públicas: se muestran en listados de
  // adopción y perdidas, a gente sin relación con la mascota. Los archivos
  // médicos y los documentos de veterinarios viven en la misma carpeta
  // uploads/, pero se sirven por endpoints que piden sesión y permisos.
  app.useStaticAssets(join(process.cwd(), 'uploads', 'mascotas'), {
    prefix: '/uploads/mascotas/',
  });
  // Railway (y cualquier proxy delante) hace que todas las requests lleguen
  // desde su IP. Sin esto, el límite de intentos del login se aplicaría a
  // todos los usuarios juntos en vez de a cada IP.
  app.set('trust proxy', 1);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

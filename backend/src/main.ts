import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

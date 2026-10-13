import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import {
  ESQUEMA_AUTENTICACION,
  ETIQUETAS_API_ORDENADAS,
} from './common/constants/documentacion-api';

/**
 * Publica la documentación OpenAPI de la API en /docs.
 *
 * Los esquemas de los DTO no se escriben a mano: los genera el plugin de
 * @nestjs/swagger configurado en nest-cli.json, que lee los tipos de
 * TypeScript, los decoradores de class-validator y los comentarios. Por eso
 * la documentación no se desactualiza cuando alguien cambia un DTO.
 *
 * En los controladores sólo hace falta aclarar lo que el plugin no puede
 * deducir: a qué módulo pertenece el endpoint (@ApiTags), qué hace
 * (@ApiOperation), qué respuestas devuelve (@ApiResponse) y si pide sesión
 * (@ApiBearerAuth).
 */
function configurarDocumentacion(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('PetCare API')
    .setDescription(
      [
        'API del backend de PetCare, consumida por la web (Angular) y la app Android.',
        '',
        'Los endpoints protegidos esperan el token JWT que devuelve `POST /auth/login`.',
        'Para probarlos desde acá: copiá el `accessToken` de esa respuesta, tocá',
        '**Authorize** arriba a la derecha y pegalo. Queda guardado para el resto de',
        'las pruebas.',
        '',
        'Los errores de la API responden siempre con la forma',
        '`{ "codigoEstado": number, "mensaje": string }`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT devuelto por POST /auth/login',
      },
      ESQUEMA_AUTENTICACION,
    );

  for (const etiqueta of ETIQUETAS_API_ORDENADAS) {
    config.addTag(etiqueta.nombre, etiqueta.descripcion);
  }

  const documento = SwaggerModule.createDocument(app, config.build());
  SwaggerModule.setup('docs', app, documento, {
    // Sin esto, recargar /docs borra el token y hay que pegarlo de nuevo en
    // cada prueba.
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'PetCare API',
  });
}

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
  configurarDocumentacion(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

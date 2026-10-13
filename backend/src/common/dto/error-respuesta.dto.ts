import { ApiProperty } from '@nestjs/swagger';

/**
 * Forma de los errores de la API, documentada una sola vez.
 *
 * Todas las excepciones del proyecto responden con este cuerpo (ver el
 * exceptionFactory del ValidationPipe en main.ts y las excepciones de cada
 * servicio), así que los controladores la referencian con
 * `@ApiResponse({ type: ErrorRespuestaDto })` en lugar de repetir el esquema.
 *
 * Esta clase es sólo para la documentación: no se instancia en tiempo de
 * ejecución.
 */
export class ErrorRespuestaDto {
  @ApiProperty({ example: 404, description: 'Código HTTP del error.' })
  codigoEstado: number;

  @ApiProperty({
    example: 'Mascota no encontrada',
    description: 'Mensaje para mostrarle a la persona usuaria.',
  })
  mensaje: string;
}

/**
 * Algunos errores agregan un `codigo` que el frontend usa para decidir a qué
 * pantalla mandar (por ejemplo SUSCRIPCION_PENDIENTE lleva a "Mi suscripción").
 */
export class ErrorConCodigoRespuestaDto extends ErrorRespuestaDto {
  @ApiProperty({
    example: 'SUSCRIPCION_PENDIENTE',
    description:
      'Identificador del caso, para que el frontend reaccione sin leer el mensaje.',
  })
  codigo: string;
}

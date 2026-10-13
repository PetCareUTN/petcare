import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ESQUEMA_AUTENTICACION } from '../constants/documentacion-api';
import { ErrorRespuestaDto } from '../dto/error-respuesta.dto';
import { RoleName } from '../enums/role-name.enum';

/**
 * Marca un endpoint como protegido en la documentación: lo asocia al botón
 * "Authorize" y declara los errores que todos comparten (401 sin token, 403
 * con el rol equivocado).
 *
 * Se usa a nivel de clase cuando todos los endpoints del controlador piden
 * sesión, o sobre un endpoint suelto cuando conviven públicos y protegidos.
 *
 * @param rol Rol que exige el endpoint, cuando exige uno. Se escribe en la
 *   descripción del 403 para que se lea en /docs sin abrir el código.
 */
export function ApiProtegido(rol?: RoleName) {
  const decoradores = [
    ApiBearerAuth(ESQUEMA_AUTENTICACION),
    ApiResponse({
      status: 401,
      description: 'Falta el token, es inválido o venció.',
      type: ErrorRespuestaDto,
    }),
  ];

  if (rol) {
    decoradores.push(
      ApiResponse({
        status: 403,
        description: `La sesión no tiene el rol ${rol}.`,
        type: ErrorRespuestaDto,
      }),
    );
  }

  return applyDecorators(...decoradores);
}

/** Respuesta 404 con el mensaje que devuelve el servicio. */
export function ApiNoEncontrado(descripcion: string) {
  return ApiResponse({
    status: 404,
    description: descripcion,
    type: ErrorRespuestaDto,
  });
}

/** Respuesta 400 para cuerpos o parámetros inválidos. */
export function ApiDatosInvalidos(
  descripcion = 'Campos obligatorios faltantes o inválidos.',
) {
  return ApiResponse({
    status: 400,
    description: descripcion,
    type: ErrorRespuestaDto,
  });
}

/** Respuesta 409 para cuando el estado actual no permite la operación. */
export function ApiConflicto(descripcion: string) {
  return ApiResponse({
    status: 409,
    description: descripcion,
    type: ErrorRespuestaDto,
  });
}

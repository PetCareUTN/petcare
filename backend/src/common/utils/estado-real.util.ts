import { ValidationStatus } from '../enums/validation-status.enum';
import type { Suscripcion } from '../../suscripciones/entities/suscripcion.entity';
import type { Veterinario } from '../../veterinarios/entities/veterinario.entity';

/**
 * Estado real que vive un usuario en la plataforma, para presentación:
 *
 * - Sin fila en `veterinarios`: estado genérico de la cuenta ('activo').
 * - Validación PENDIENTE: 'pendiente_validacion' (mandó docs, sin revisar).
 * - Validación RECHAZADO: 'rechazado'.
 * - Validación APROBADO: estado de la suscripción; si nunca se suscribió,
 *   'pendiente_pago'.
 *
 * Los valores van en minúsculas con guion bajo para unificar el criterio de
 * presentación: la BD y los enums internos (SuscripcionEstado,
 * ValidationStatus) siguen en mayúsculas.
 */
export function estadoRealDeVeterinario(
  veterinario: Veterinario | null | undefined,
  suscripcion?: Suscripcion | null,
  estadoUsuario = 'activo',
): string {
  if (!veterinario) {
    return estadoUsuario;
  }

  if (veterinario.estadoValidacion === ValidationStatus.PENDIENTE) {
    return 'pendiente_validacion';
  }

  if (veterinario.estadoValidacion === ValidationStatus.RECHAZADO) {
    return 'rechazado';
  }

  return suscripcion?.estado?.toLowerCase() ?? 'pendiente_pago';
}

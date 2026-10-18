export type SuscripcionEstado =
  | 'pendiente_pago'
  | 'en_prueba'
  | 'activa'
  | 'vencida'
  | 'suspendida'
  | 'cancelada';

/** Códigos internos de bloqueo que manda el backend en el HTTP 402. */
export type CodigoBloqueo =
  | 'CUENTA_NO_APROBADA'
  | 'SUSCRIPCION_PENDIENTE'
  | 'SUSCRIPCION_VENCIDA'
  | 'SUSCRIPCION_SUSPENDIDA'
  | 'SUSCRIPCION_CANCELADA';

export interface SuscripcionResponse {
  idSuscripcion: number;
  idUsuario: number;
  estado: SuscripcionEstado;
  monto: number;
  moneda: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  fechaVencimiento: string | null;
  fechaGraciaInicio: string | null;
  /** Fin del período de prueba gratuito (solo si estuvo en prueba). */
  fechaPruebaFin: string | null;
  /** True si la suscripción está en un período de prueba todavía vigente. */
  esPrueba: boolean;
  accesoPermitido: boolean;
  motivoBloqueo: string | null;
  codigoBloqueo: CodigoBloqueo | null;
}

export interface SuscribirmeResponse {
  initPoint: string;
  suscripcion: SuscripcionResponse;
}

export interface PagoResponse {
  idPago: number;
  idSuscripcion: number;
  monto: number;
  moneda: string;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'cancelado';
  mpPaymentId: string | null;
  mpStatus: string | null;
  fechaPago: string | null;
  createdAt: string;
}

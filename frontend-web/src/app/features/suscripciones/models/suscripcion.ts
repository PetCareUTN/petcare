export type SuscripcionEstado =
  | 'PENDIENTE_PAGO'
  | 'ACTIVA'
  | 'VENCIDA'
  | 'SUSPENDIDA'
  | 'CANCELADA';

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

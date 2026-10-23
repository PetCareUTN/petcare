export enum SuscripcionEstado {
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  /** Período de prueba gratuito (3 meses), sin preapproval en MP. */
  EN_PRUEBA = 'EN_PRUEBA',
  ACTIVA = 'ACTIVA',
  VENCIDA = 'VENCIDA',
  /** Excedió la gracia tras un fallo de renovación: acceso bloqueado. */
  SUSPENDIDA = 'SUSPENDIDA',
  CANCELADA = 'CANCELADA',
}

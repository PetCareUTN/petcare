export enum SuscripcionEstado {
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  ACTIVA = 'ACTIVA',
  VENCIDA = 'VENCIDA',
  /** Excedió la gracia tras un fallo de renovación: acceso bloqueado. */
  SUSPENDIDA = 'SUSPENDIDA',
  CANCELADA = 'CANCELADA',
}

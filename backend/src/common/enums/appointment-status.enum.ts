/**
 * Estados por los que pasa un turno veterinario.
 *
 * El turno nace en CONFIRMADO: la reserva es autogestionada y no necesita que
 * el veterinario la apruebe. PENDIENTE sobrevive solo como default de la
 * columna en la base y RECHAZADO quedó de un flujo de aprobación que no se
 * implementó; ninguno de los dos se asigna desde el código (ver P1-193).
 *
 * ASISTIO y AUSENTE son los estados terminales que cierran el turno una vez
 * que pasó su horario, y son lo que permite medir ausentismo.
 */
export enum AppointmentStatus {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  RECHAZADO = 'rechazado',
  CANCELADO = 'cancelado',
  /** El cliente se presentó y se lo atendió. */
  ASISTIO = 'asistio',
  /** El cliente no se presentó. */
  AUSENTE = 'ausente',
}

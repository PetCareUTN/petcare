export type TurnoServicioEstado = 'confirmado' | 'cancelado';
/** Unificado entre turnos de servicio (prestador) y turnos veterinarios (veterinario). */
export type CanceladoPor = 'dueño' | 'prestador' | 'veterinario';

export interface TurnoServicioResponse {
  idTurno: number;
  idServicio: number;
  categoria: string;
  idMascota: number;
  nombreMascota: string;
  idDuenio: number;
  nombreDuenio: string;
  emailDuenio: string;
  telefonoDuenio: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notas: string | null;
  estado: TurnoServicioEstado;
  motivoCancelacion: string | null;
  canceladoPor: CanceladoPor | null;
}

export interface CancelarTurnoServicioRequest {
  motivoCancelacion?: string;
}

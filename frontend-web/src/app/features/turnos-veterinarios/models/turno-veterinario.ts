export type AppointmentStatus =
  | 'confirmado'
  | 'cancelado'
  | 'asistio'
  | 'ausente';

/** Estados que cierran el turno una vez que paso (P1-193). */
export const ESTADOS_DE_ASISTENCIA: AppointmentStatus[] = ['asistio', 'ausente'];
export type CanceladoPorVeterinaria = 'dueño' | 'veterinario';

export interface TurnoVeterinarioResponse {
  idTurno: number;
  idVeterinario: number;
  idMascota: number;
  nombreMascota: string;
  idDuenio: number;
  nombreDuenio: string;
  emailDuenio: string;
  telefonoDuenio: string | null;
  fecha: string;
  hora: string;
  motivoConsulta: string | null;
  estado: AppointmentStatus;
  motivoRechazo: string | null;
  canceladoPor: CanceladoPorVeterinaria | null;
  motivoCancelacion: string | null;
}

export interface RegistrarAsistenciaRequest {
  /** `true` si el cliente se presento, `false` si no vino. */
  asistio: boolean;
}

export interface CancelarTurnoVeterinarioRequest {
  motivoCancelacion?: string;
}

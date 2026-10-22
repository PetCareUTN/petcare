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
  /** Quién cargó el turno: el dueño desde la app o la veterinaria desde la web. */
  creadoPor: CanceladoPorVeterinaria;
  /** La veterinaria lo cargó con el horario ya lleno, a propósito. */
  sobrecupo: boolean;
}

/** Turno que carga la veterinaria para la mascota de un cliente. */
export interface AgendarTurnoVeterinarioRequest {
  idMascota: number;
  /** Dueño al que se asocia; si falta, el backend usa el principal. */
  idDuenio?: number;
  fecha: string;
  hora: string;
  motivoConsulta?: string;
  /** Agendar igual aunque el horario ya no tenga cupos. */
  forzar?: boolean;
}

/** Una franja de 30 minutos de la agenda con su capacidad y ocupación. */
export interface CapacidadHorario {
  fecha: string;
  hora: string;
  /** Cupos del horario de atención. */
  cupos: number;
  ocupados: number;
}

/** Error del alta de turno; en un 409 por horario lleno trae los cupos. */
export interface AgendarTurnoError {
  codigoEstado: number;
  mensaje: string;
  codigo?: string;
  cupos?: number;
  ocupados?: number;
}

export interface RegistrarAsistenciaRequest {
  /** `true` si el cliente se presento, `false` si no vino. */
  asistio: boolean;
}

export interface CancelarTurnoVeterinarioRequest {
  motivoCancelacion?: string;
}

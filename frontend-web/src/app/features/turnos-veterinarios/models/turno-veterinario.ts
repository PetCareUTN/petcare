export type AppointmentStatus = 'confirmado' | 'cancelado';
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

export interface CancelarTurnoVeterinarioRequest {
  motivoCancelacion?: string;
}

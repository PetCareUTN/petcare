export type AppointmentStatus = 'pendiente' | 'confirmado' | 'rechazado' | 'cancelado';

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
}

export interface RechazarTurnoVeterinarioRequest {
  motivoRechazo: string;
}

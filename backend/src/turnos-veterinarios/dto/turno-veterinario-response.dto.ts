import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import {
  CanceladoPor,
  CreadoPor,
  TurnoVeterinario,
} from '../entities/turno-veterinario.entity';

export class TurnoVeterinarioResponseDto {
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
  canceladoPor: CanceladoPor | null;
  motivoCancelacion: string | null;
  creadoPor: CreadoPor;
  sobrecupo: boolean;

  static fromEntity(turno: TurnoVeterinario): TurnoVeterinarioResponseDto {
    return {
      idTurno: turno.idTurno,
      idVeterinario: turno.veterinario.idVeterinario,
      idMascota: turno.mascota.idMascota,
      nombreMascota: turno.mascota.nombre,
      idDuenio: turno.duenio.idUsuario,
      nombreDuenio: [turno.duenio.nombre, turno.duenio.apellido]
        .filter(Boolean)
        .join(' '),
      emailDuenio: turno.duenio.email,
      telefonoDuenio: turno.duenio.telefono,
      fecha: turno.fecha,
      hora: turno.hora,
      motivoConsulta: turno.motivoConsulta,
      estado: turno.estado,
      motivoRechazo: turno.motivoRechazo,
      canceladoPor: turno.canceladoPor,
      motivoCancelacion: turno.motivoCancelacion,
      creadoPor: turno.creadoPor ?? 'dueño',
      sobrecupo: turno.sobrecupo ?? false,
    };
  }
}

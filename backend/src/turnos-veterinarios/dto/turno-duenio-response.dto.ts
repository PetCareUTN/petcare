import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { TurnoVeterinario } from '../entities/turno-veterinario.entity';

/**
 * Vista del turno para el dueño de la mascota. A diferencia de
 * `TurnoVeterinarioResponseDto` (pensado para la veterinaria), la contraparte
 * que se muestra es la veterinaria y no se repiten los datos del propio dueño.
 */
export class TurnoDuenioResponseDto {
  idTurno: number;
  idMascota: number;
  nombreMascota: string;
  idVeterinario: number;
  nombreVeterinaria: string;
  direccionVeterinaria: string | null;
  fecha: string;
  hora: string;
  motivoConsulta: string | null;
  estado: AppointmentStatus;
  motivoRechazo: string | null;

  static fromEntity(turno: TurnoVeterinario): TurnoDuenioResponseDto {
    return {
      idTurno: turno.idTurno,
      idMascota: turno.mascota.idMascota,
      nombreMascota: turno.mascota.nombre,
      idVeterinario: turno.veterinario.idVeterinario,
      nombreVeterinaria: turno.veterinario.usuario.nombre,
      direccionVeterinaria: turno.veterinario.usuario.direccion,
      fecha: turno.fecha,
      hora: turno.hora,
      motivoConsulta: turno.motivoConsulta,
      estado: turno.estado,
      motivoRechazo: turno.motivoRechazo,
    };
  }
}

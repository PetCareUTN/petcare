import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';
import { TurnoServicioEstado } from '../../common/enums/turno-servicio-estado.enum';
import { CanceladoPor, TurnoServicio } from '../entities/turno-servicio.entity';

/**
 * Vista del turno para el prestador (dueño del servicio). La contraparte que
 * se muestra es el dueño de la mascota que reservó.
 */
export class TurnoServicioPrestadorResponseDto {
  idTurno: number;
  idServicio: number;
  categoria: CategoriaServicio;
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

  static fromEntity(turno: TurnoServicio): TurnoServicioPrestadorResponseDto {
    return {
      idTurno: turno.idTurno,
      idServicio: turno.servicio.idServicio,
      categoria: turno.servicio.categoria,
      idMascota: turno.mascota.idMascota,
      nombreMascota: turno.mascota.nombre,
      idDuenio: turno.duenio.idUsuario,
      nombreDuenio: [turno.duenio.nombre, turno.duenio.apellido]
        .filter(Boolean)
        .join(' '),
      emailDuenio: turno.duenio.email,
      telefonoDuenio: turno.duenio.telefono,
      fecha: turno.fecha,
      horaInicio: turno.horaInicio,
      horaFin: turno.horaFin,
      notas: turno.notas,
      estado: turno.estado,
      motivoCancelacion: turno.motivoCancelacion,
      canceladoPor: turno.canceladoPor,
    };
  }
}

import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';
import { TurnoServicioEstado } from '../../common/enums/turno-servicio-estado.enum';
import { CanceladoPor, TurnoServicio } from '../entities/turno-servicio.entity';

/**
 * Vista del turno para el dueño de la mascota. A diferencia de
 * `TurnoServicioPrestadorResponseDto`, la contraparte que se muestra es el
 * prestador del servicio y no se repiten los datos del propio dueño.
 */
export class TurnoServicioDuenioResponseDto {
  idTurno: number;
  idMascota: number;
  nombreMascota: string;
  idServicio: number;
  categoria: CategoriaServicio;
  idPrestador: number;
  nombrePrestador: string;
  telefonoPrestador: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  notas: string | null;
  estado: TurnoServicioEstado;
  motivoCancelacion: string | null;
  canceladoPor: CanceladoPor | null;

  static fromEntity(turno: TurnoServicio): TurnoServicioDuenioResponseDto {
    return {
      idTurno: turno.idTurno,
      idMascota: turno.mascota.idMascota,
      nombreMascota: turno.mascota.nombre,
      idServicio: turno.servicio.idServicio,
      categoria: turno.servicio.categoria,
      idPrestador: turno.servicio.usuario.idUsuario,
      nombrePrestador: [turno.servicio.usuario.nombre, turno.servicio.usuario.apellido]
        .filter(Boolean)
        .join(' '),
      telefonoPrestador: turno.servicio.usuario.telefono,
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

import { TurnoEstado } from '../../common/enums/turno-estado.enum';
import { Turno } from '../entities/turno.entity';

export class TurnoResponseDto {
  idTurno: number;
  idMascota: number;
  nombreMascota: string;
  idVeterinario: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: TurnoEstado;
  createdAt: Date;

  static fromEntity(turno: Turno): TurnoResponseDto {
    const dto = new TurnoResponseDto();
    dto.idTurno = turno.idTurno;
    dto.idMascota = turno.mascota.idMascota;
    dto.nombreMascota = turno.mascota.nombre;
    dto.idVeterinario = turno.veterinario.idVeterinario;
    dto.fecha = turno.fecha;
    dto.horaInicio = turno.horaInicio;
    dto.horaFin = turno.horaFin;
    dto.estado = turno.estado;
    dto.createdAt = turno.createdAt;
    return dto;
  }
}

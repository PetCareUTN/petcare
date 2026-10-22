import { DiaSemana } from '../../common/enums/dia-semana.enum';
import { TipoDisponibilidad } from '../../common/enums/tipo-disponibilidad.enum';
import { DisponibilidadVeterinaria } from '../entities/disponibilidad-veterinaria.entity';

export class DisponibilidadVeterinariaResponseDto {
  idDisponibilidad: number;
  idVeterinario: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  cuposPorTurno: number;
  tipo: TipoDisponibilidad;

  static fromEntity(
    disponibilidad: DisponibilidadVeterinaria,
  ): DisponibilidadVeterinariaResponseDto {
    return {
      idDisponibilidad: disponibilidad.idDisponibilidad,
      idVeterinario: disponibilidad.veterinario.idVeterinario,
      diaSemana: disponibilidad.diaSemana,
      horaInicio: disponibilidad.horaInicio,
      horaFin: disponibilidad.horaFin,
      cuposPorTurno: disponibilidad.cuposPorTurno,
      tipo: disponibilidad.tipo,
    };
  }
}

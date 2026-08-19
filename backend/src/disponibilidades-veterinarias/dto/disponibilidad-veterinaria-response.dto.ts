import { DiaSemana } from '../../common/enums/dia-semana.enum';
import { DisponibilidadVeterinaria } from '../entities/disponibilidad-veterinaria.entity';

export class DisponibilidadVeterinariaResponseDto {
  idDisponibilidad: number;
  idVeterinario: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;

  static fromEntity(
    disponibilidad: DisponibilidadVeterinaria,
  ): DisponibilidadVeterinariaResponseDto {
    return {
      idDisponibilidad: disponibilidad.idDisponibilidad,
      idVeterinario: disponibilidad.veterinario.idVeterinario,
      diaSemana: disponibilidad.diaSemana,
      horaInicio: disponibilidad.horaInicio,
      horaFin: disponibilidad.horaFin,
    };
  }
}

/** Una franja de 30 minutos de la agenda de la veterinaria, con su ocupación. */
export class CapacidadHorarioResponseDto {
  fecha: string;
  hora: string;
  /** Cupos del horario de atención. */
  cupos: number;
  /** Turnos que ya ocupan la franja (si superan los cupos, el excedente son sobreturnos). */
  ocupados: number;
}

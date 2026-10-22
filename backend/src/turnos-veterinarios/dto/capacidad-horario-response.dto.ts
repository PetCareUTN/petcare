/** Una franja de 30 minutos de la agenda de la veterinaria, con su ocupación. */
export class CapacidadHorarioResponseDto {
  fecha: string;
  hora: string;
  /** Cupos del horario de atención. */
  cuposAtencion: number;
  /** Cupos de sobreturno (semanales y de fecha puntual). */
  cuposSobreturno: number;
  /** Turnos que ya ocupan la franja. */
  ocupados: number;
}

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

/** Horario de atención o sobreturno semanal: las dos suman cupos. */
export type TipoDisponibilidad = 'atencion' | 'sobreturno';

export interface DisponibilidadVeterinariaRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  cuposPorTurno: number;
  tipo: TipoDisponibilidad;
}

export interface UpdateDisponibilidadVeterinariaRequest {
  disponibilidades: DisponibilidadVeterinariaRequest[];
}

export interface DisponibilidadVeterinariaResponse {
  idDisponibilidad: number;
  idVeterinario: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  cuposPorTurno: number;
  tipo: TipoDisponibilidad;
}

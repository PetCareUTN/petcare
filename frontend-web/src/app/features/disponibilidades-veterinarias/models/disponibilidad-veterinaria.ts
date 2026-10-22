export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface DisponibilidadVeterinariaRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  cuposPorTurno: number;
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
}

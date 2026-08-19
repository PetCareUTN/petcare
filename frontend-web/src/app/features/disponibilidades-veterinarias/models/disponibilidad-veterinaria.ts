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
}

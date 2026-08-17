export type CategoriaServicio = 'paseador' | 'guarderia' | 'peluqueria';

export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export interface DisponibilidadRequest {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface CreateServicioRequest {
  categoria: CategoriaServicio;
  descripcion?: string;
  disponibilidades: DisponibilidadRequest[];
}

export type UpdateServicioRequest = Partial<CreateServicioRequest>;

export interface DisponibilidadResponse {
  idDisponibilidad: number;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface ServicioResponse {
  idServicio: number;
  idUsuario: number;
  categoria: CategoriaServicio;
  descripcion: string | null;
  disponibilidades: DisponibilidadResponse[];
}

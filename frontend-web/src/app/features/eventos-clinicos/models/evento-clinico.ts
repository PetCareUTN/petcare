export type ClinicalEventType =
  | 'consulta'
  | 'diagnostico'
  | 'tratamiento'
  | 'cirugia'
  | 'control'
  | 'observacion'
  | 'otro';

export interface CreateEventoClinicoRequest {
  idMascota: number;
  tipo: ClinicalEventType;
  fecha: string;
  descripcion: string;
  diagnostico?: string;
  tratamiento?: string;
  observaciones?: string;
}

export interface EventoClinicoResponse {
  idEvento: number;
  idHistoria: number;
  idMascota: number;
  idVeterinario: number;
  tipo: ClinicalEventType;
  fecha: string;
  descripcion: string;
  diagnostico: string | null;
  tratamiento: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoriaClinicaResponse {
  idHistoria: number | null;
  idMascota: number;
  fechaCreacion: string | null;
  eventos: EventoClinicoResponse[];
}

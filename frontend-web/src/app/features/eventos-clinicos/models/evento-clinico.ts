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

export interface ArchivoMedicoResponse {
  idArchivo: number;
  idEvento: number;
  nombreOriginal: string;
  url: string;
  mimeType: string;
  tamanoBytes: number;
  createdAt: string;
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
  archivos: ArchivoMedicoResponse[];
}

export interface HistoriaClinicaResponse {
  idHistoria: number | null;
  idMascota: number;
  fechaCreacion: string | null;
  eventos: EventoClinicoResponse[];
}

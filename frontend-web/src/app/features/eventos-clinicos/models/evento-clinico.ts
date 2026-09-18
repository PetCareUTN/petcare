export type ClinicalEventType =
  | 'consulta'
  | 'vacuna'
  | 'diagnostico'
  | 'tratamiento'
  | 'cirugia'
  | 'control'
  | 'observacion'
  | 'otro';

/**
 * Vacunas que el veterinario puede registrar (US-40).
 *
 * Lista cerrada y no texto libre: el recordatorio compara dos registros para
 * saber si una dosis ya fue reaplicada, y eso exige que el valor sea idéntico.
 */
export type TipoVacuna =
  | 'quintuple'
  | 'sextuple'
  | 'traqueobronquitis'
  | 'triple_felina'
  | 'leucemia_felina'
  | 'antirrabica';

export interface CreateEventoClinicoRequest {
  idMascota: number;
  tipo: ClinicalEventType;
  fecha: string;
  descripcion: string;
  diagnostico?: string;
  tratamiento?: string;
  observaciones?: string;
  /** Obligatorios cuando `tipo` es 'vacuna' (US-40). */
  vacuna?: TipoVacuna;
  proximaAplicacion?: string;
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
  vacuna: TipoVacuna | null;
  proximaAplicacion: string | null;
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

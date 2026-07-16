export type PetSex = 'macho' | 'hembra';

export interface CreateMascotaRequest {
  nombre: string;
  especie: string;
  raza?: string;
  sexo: PetSex;
  fechaNacimiento?: string;
  peso?: number;
  esterilizado?: boolean;
  foto?: string;
  observaciones?: string;
}

export interface MascotaResponse {
  idMascota: number;
  nombre: string;
  idHistoria: number | null;
  especie: string;
  raza: string | null;
  sexo: PetSex;
  fechaNacimiento: string | null;
  peso: number | null;
  esterilizado: boolean;
  foto: string | null;
  observaciones: string | null;
  idUsuarios: number[];
}

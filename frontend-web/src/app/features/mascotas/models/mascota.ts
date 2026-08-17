export type PetSex = 'macho' | 'hembra';

export interface CreateMascotaRequest {
  nombre: string;
  especie: string;
  raza?: string;
  sexo: PetSex;
  fechaNacimiento?: string;
  peso?: number;
  esterilizado?: boolean;
  observaciones?: string;
  alergias?: string;
}

export type UpdateMascotaRequest = Partial<CreateMascotaRequest>;

export interface MascotaOwner {
  id_usuario: number;
  nombre: string;
  apellido: string | null;
  email: string;
  numero_documento: string | null;
  telefono: string | null;
  direccion: string | null;
  id_rol: number;
  estado: string;
  fecha_registro: string;
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
  alergias: string | null;
  idUsuarios: number[];
}

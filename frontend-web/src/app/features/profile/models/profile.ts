export interface UserProfile {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  id_rol: number;
  estado: string;
  fecha_registro: string;
}

export interface UpdateProfileRequest {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

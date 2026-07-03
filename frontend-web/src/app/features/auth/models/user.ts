export type RoleName = 'dueño_mascota' | 'veterinario' | 'administrador';

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  rol: RoleName;
}

export interface RegisterResponse {
  idUsuario: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: RoleName;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: RegisterResponse;
}

export interface ApiError {
  codigoEstado: number;
  mensaje: string;
}

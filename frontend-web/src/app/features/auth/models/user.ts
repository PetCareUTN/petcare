// Roles seedeados en database/seeders/01-roles.sql, en orden de id_rol:
// 1: dueño_mascota | 2: veterinario | 3: administrador | 4: prestador
export type RoleName = 'dueño_mascota' | 'veterinario' | 'administrador' | 'prestador';

export interface RegisterRequest {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  id_rol: number;
  estado: string;
  fecha_registro: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: RegisterResponse;
}

export interface AssistedOwnerRequest {
  nombre: string;
  apellido?: string | null;
  email: string;
  telefono?: string | null;
}

export interface AssistedOwnerResponse {
  mensaje: string;
  usuario: RegisterResponse;
}

export interface ApiError {
  codigoEstado: number;
  mensaje: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  codigo: string;
  nuevaContraseña: string;
}

export interface DatosCuentaVeterinario {
  id_usuario: number;
  nombre: string;
  apellido: string | null;
  email: string;
  telefono: string | null;
  direccion: string | null;
  estado: string;
}

export interface CambiarContrasenaRequest {
  viejaContraseña: string;
  nuevaContraseña: string;
}

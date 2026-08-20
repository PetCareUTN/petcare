export interface UsuarioAdmin {
  id_usuario: number;
  nombre: string;
  apellido: string | null;
  email: string;
  numero_documento: string | null;
  telefono: string | null;
  direccion: string | null;
  id_rol: number;
  nombre_rol: string;
  estado: string;
  fecha_registro: string;
}

export interface Rol {
  idRol: number;
  nombre: string;
}

export interface AuditoriaRegistro {
  id_auditoria: number;
  id_usuario: number;
  tipo_accion: string;
  detalle: Record<string, unknown> | null;
  fecha_accion: string;
}

export interface ListarUsuariosResponse {
  usuarios: UsuarioAdmin[];
  total: number;
  pagina: number;
  limite: number;
}

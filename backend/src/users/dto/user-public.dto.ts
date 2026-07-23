import { User } from '../entities/user.entity';

/**
 * Representación pública de un usuario (sin `password`).
 * Se usa en las respuestas de login y de rutas protegidas.
 */
export class UserPublicDto {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string | null;
  id_rol: number;
  estado: string;
  fecha_registro: Date;

  static fromEntity(user: User): UserPublicDto {
    const dto = new UserPublicDto();
    dto.id_usuario = user.idUsuario;
    dto.nombre = user.nombre;
    dto.apellido = user.apellido;
    dto.email = user.email;
    dto.telefono = user.telefono ?? null;
    dto.id_rol = user.rol.idRol;
    dto.estado = user.estado;
    dto.fecha_registro = user.fechaRegistro;
    return dto;
  }
}

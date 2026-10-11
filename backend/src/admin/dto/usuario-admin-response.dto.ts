import { estadoRealDeVeterinario } from '../../common/utils/estado-real.util';
import { Suscripcion } from '../../suscripciones/entities/suscripcion.entity';
import { User } from '../../users/entities/user.entity';

export class UsuarioAdminResponseDto {
  id_usuario: number;
  nombre: string;
  apellido: string | null;
  email: string;
  numero_documento: string | null;
  telefono: string | null;
  direccion: string | null;
  id_rol: number;
  nombre_rol: string;
  /** Estado real del usuario (ver estadoRealDeVeterinario), en minúsculas. */
  estado: string;
  fecha_registro: Date;

  static fromEntity(
    user: User,
    suscripcion?: Suscripcion | null,
  ): UsuarioAdminResponseDto {
    const dto = new UsuarioAdminResponseDto();
    dto.id_usuario = user.idUsuario;
    dto.nombre = user.nombre;
    dto.apellido = user.apellido;
    dto.email = user.email;
    dto.numero_documento = user.numeroDocumento ?? null;
    dto.telefono = user.telefono ?? null;
    dto.direccion = user.direccion ?? null;
    dto.id_rol = user.rol.idRol;
    dto.nombre_rol = user.rol.nombre;
    dto.estado = estadoRealDeVeterinario(
      user.veterinario,
      suscripcion,
      user.estado,
    );
    dto.fecha_registro = user.fechaRegistro;
    return dto;
  }
}

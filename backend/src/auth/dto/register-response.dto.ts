import { User } from '../../users/entities/user.entity';

export class RegisterResponseDto {
  id_usuario: number;
  nombre: string;
  apellido: string | null;
  email: string;
  id_rol: number;
  estado: string;
  fecha_registro: Date;

  static fromEntity(user: User): RegisterResponseDto {
    const dto = new RegisterResponseDto();
    dto.id_usuario = user.idUsuario;
    dto.nombre = user.nombre;
    dto.apellido = user.apellido;
    dto.email = user.email;
    dto.id_rol = user.rol.idRol;
    dto.estado = user.estado;
    dto.fecha_registro = user.fechaRegistro;
    return dto;
  }
}

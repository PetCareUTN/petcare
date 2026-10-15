import { User } from '../../users/entities/user.entity';
import { UserPublicDto } from '../../users/dto/user-public.dto';

/**
 * Respuesta de POST /auth/google. Puede terminar en dos lugares distintos:
 * - la cuenta ya existe -> viene el token y se entra derecho;
 * - es alguien nuevo -> `requiereRegistro` en true y los datos que trajo Google
 *   para precargar la pantalla de completar registro (donde se pide el DNI).
 */
export class GoogleLoginResponseDto {
  requiereRegistro: boolean;
  token?: string;
  usuario?: UserPublicDto;
  nombre?: string;
  apellido?: string;
  email?: string;

  static conSesion(token: string, user: User): GoogleLoginResponseDto {
    const dto = new GoogleLoginResponseDto();
    dto.requiereRegistro = false;
    dto.token = token;
    dto.usuario = UserPublicDto.fromEntity(user);
    return dto;
  }

  static registroPendiente(datos: {
    nombre: string;
    apellido: string | null;
    email: string;
  }): GoogleLoginResponseDto {
    const dto = new GoogleLoginResponseDto();
    dto.requiereRegistro = true;
    dto.nombre = datos.nombre;
    dto.apellido = datos.apellido ?? undefined;
    dto.email = datos.email;
    return dto;
  }
}

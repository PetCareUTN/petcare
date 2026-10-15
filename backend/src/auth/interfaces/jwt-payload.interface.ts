import { RoleName } from '../../common/enums/role-name.enum';

/**
 * Contenido del token JWT. Incluye el identificador del usuario (`sub`) y su
 * rol, según lo requiere el criterio de aceptación de US-02.
 */
export interface JwtPayload {
  /** id_usuario */
  sub: number;
  email: string;
  /** id_rol */
  idRol: number;
  /** nombre del rol (dueño_mascota, veterinario, ...) */
  rol: RoleName;
}

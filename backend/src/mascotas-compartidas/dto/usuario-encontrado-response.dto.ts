import { User } from '../../users/entities/user.entity';

/**
 * Lo mínimo para que quien comparte confirme que encontró a la persona
 * correcta, sin exponer su email ni su documento.
 */
export class UsuarioEncontradoResponseDto {
  idUsuario: number;
  /** Nombre y la inicial del apellido, por ejemplo "Marta G.". */
  nombreParcial: string;

  static fromEntity(user: User): UsuarioEncontradoResponseDto {
    const inicial = user.apellido?.trim().charAt(0).toUpperCase();
    return {
      idUsuario: user.idUsuario,
      nombreParcial: inicial ? `${user.nombre} ${inicial}.` : user.nombre,
    };
  }
}

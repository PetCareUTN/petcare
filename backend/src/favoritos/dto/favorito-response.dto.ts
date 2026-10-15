import { PublicacionAdopcionResponseDto } from '../../adopciones/dto/publicacion-adopcion-response.dto';
import { Favorito } from '../entities/favorito.entity';

export class FavoritoResponseDto {
  idFavorito: number;
  createdAt: Date;
  publicacion: PublicacionAdopcionResponseDto;

  static fromEntity(favorito: Favorito): FavoritoResponseDto {
    return {
      idFavorito: favorito.idFavorito,
      createdAt: favorito.createdAt,
      publicacion: PublicacionAdopcionResponseDto.fromEntity(
        favorito.publicacion,
      ),
    };
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { CreateFavoritoDto } from './dto/create-favorito.dto';
import { FavoritoResponseDto } from './dto/favorito-response.dto';
import { Favorito } from './entities/favorito.entity';

@Injectable()
export class FavoritosService {
  constructor(
    @InjectRepository(Favorito)
    private readonly favoritosRepository: Repository<Favorito>,
    @InjectRepository(PublicacionAdopcion)
    private readonly publicacionesRepository: Repository<PublicacionAdopcion>,
  ) {}

  async agregar(
    idUsuario: number,
    dto: CreateFavoritoDto,
  ): Promise<FavoritoResponseDto> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { idPublicacion: dto.idPublicacion },
      relations: ['mascota'],
    });

    if (!publicacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Publicación de adopción no encontrada',
      });
    }

    const existente = await this.favoritosRepository.findOne({
      where: {
        publicacion: { idPublicacion: dto.idPublicacion },
        usuario: { idUsuario },
      },
    });
    if (existente) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Ya tenés esta mascota en favoritos',
      });
    }

    const favorito = this.favoritosRepository.create({
      publicacion,
      usuario: { idUsuario } as User,
    });
    const guardado = await this.favoritosRepository.save(favorito);
    guardado.publicacion = publicacion;

    return FavoritoResponseDto.fromEntity(guardado);
  }

  async quitar(idUsuario: number, idPublicacion: number): Promise<void> {
    const favorito = await this.favoritosRepository.findOne({
      where: {
        publicacion: { idPublicacion },
        usuario: { idUsuario },
      },
    });

    if (!favorito) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Esa mascota no está en tus favoritos',
      });
    }

    await this.favoritosRepository.remove(favorito);
  }

  async listar(idUsuario: number): Promise<FavoritoResponseDto[]> {
    const favoritos = await this.favoritosRepository.find({
      where: { usuario: { idUsuario } },
      relations: ['publicacion', 'publicacion.mascota'],
      order: { createdAt: 'DESC' },
    });

    return favoritos.map((favorito) => FavoritoResponseDto.fromEntity(favorito));
  }
}

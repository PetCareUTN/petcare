import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { CreateDescarteDto } from './dto/create-descarte.dto';
import { DescarteAdopcion } from './entities/descarte-adopcion.entity';

@Injectable()
export class DescartesService {
  constructor(
    @InjectRepository(DescarteAdopcion)
    private readonly descartesRepository: Repository<DescarteAdopcion>,
    @InjectRepository(PublicacionAdopcion)
    private readonly publicacionesRepository: Repository<PublicacionAdopcion>,
  ) {}

  /**
   * Registra que el usuario pasó una publicación para que deje de aparecerle.
   * Pasar dos veces la misma no es un error: el resultado buscado ya se cumple.
   */
  async descartar(idUsuario: number, dto: CreateDescarteDto): Promise<void> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { idPublicacion: dto.idPublicacion },
    });

    if (!publicacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Publicación de adopción no encontrada',
      });
    }

    const existente = await this.descartesRepository.findOne({
      where: {
        publicacion: { idPublicacion: dto.idPublicacion },
        usuario: { idUsuario },
      },
    });
    if (existente) {
      return;
    }

    const descarte = this.descartesRepository.create({
      publicacion,
      usuario: { idUsuario } as User,
    });
    await this.descartesRepository.save(descarte);
  }

  /** Vacía los descartes del usuario: vuelve a ver todas las publicaciones. */
  async limpiar(idUsuario: number): Promise<void> {
    await this.descartesRepository.delete({ usuario: { idUsuario } });
  }
}

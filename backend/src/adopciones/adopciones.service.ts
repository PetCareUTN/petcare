import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdopcionStatus } from '../common/enums/adopcion-status.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { User } from '../users/entities/user.entity';
import { CreatePublicacionAdopcionDto } from './dto/create-publicacion-adopcion.dto';
import { PublicacionAdopcionResponseDto } from './dto/publicacion-adopcion-response.dto';
import { PublicacionAdopcion } from './entities/publicacion-adopcion.entity';

@Injectable()
export class AdopcionesService {
  constructor(
    @InjectRepository(PublicacionAdopcion)
    private readonly publicacionesRepository: Repository<PublicacionAdopcion>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Publica una mascota propia en adopción. Valida que la mascota exista, que
   * pertenezca al usuario autenticado y que no tenga ya una publicación activa.
   * No transfiere la propiedad de la mascota.
   */
  async publicar(
    idUsuario: number,
    dto: CreatePublicacionAdopcionDto,
  ): Promise<PublicacionAdopcionResponseDto> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota: dto.idMascota },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Mascota no encontrada',
      });
    }

    const esDuenio = mascota.usuarios?.some(
      (usuario) => usuario.idUsuario === idUsuario,
    );
    if (!esDuenio) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No podés publicar una mascota que no es tuya',
      });
    }

    const publicacionActiva = await this.publicacionesRepository.findOne({
      where: {
        mascota: { idMascota: dto.idMascota },
        estado: AdopcionStatus.ACTIVA,
      },
    });
    if (publicacionActiva) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La mascota ya tiene una publicación de adopción activa',
      });
    }

    const usuario = await this.usersRepository.findOne({
      where: { idUsuario },
    });
    if (!usuario) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }

    const publicacion = this.publicacionesRepository.create({
      mascota,
      usuario,
      descripcion: dto.descripcion,
      estado: AdopcionStatus.ACTIVA,
    });
    const guardada = await this.publicacionesRepository.save(publicacion);
    guardada.mascota = mascota;

    return PublicacionAdopcionResponseDto.fromEntity(guardada);
  }
}

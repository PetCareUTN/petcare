import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
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

  /**
   * Lista las publicaciones de adopción activas de otros usuarios, más
   * recientes primero. Excluye las publicaciones propias: no tendría sentido
   * solicitar la adopción de la propia mascota.
   */
  async findAll(idUsuario: number): Promise<PublicacionAdopcionResponseDto[]> {
    const publicaciones = await this.publicacionesRepository.find({
      where: {
        estado: AdopcionStatus.ACTIVA,
        usuario: { idUsuario: Not(idUsuario) },
      },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });

    return publicaciones.map((publicacion) =>
      PublicacionAdopcionResponseDto.fromEntity(publicacion),
    );
  }

  /**
   * Publicaciones de adopción propias del usuario autenticado, para que
   * pueda verlas por separado del listado general.
   */
  async findMisPublicaciones(
    idUsuario: number,
  ): Promise<PublicacionAdopcionResponseDto[]> {
    const publicaciones = await this.publicacionesRepository.find({
      where: { usuario: { idUsuario } },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });

    return publicaciones.map((publicacion) =>
      PublicacionAdopcionResponseDto.fromEntity(publicacion),
    );
  }

  async findOne(idPublicacion: number): Promise<PublicacionAdopcionResponseDto> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { idPublicacion, estado: AdopcionStatus.ACTIVA },
      relations: ['mascota'],
    });

    if (!publicacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Publicación de adopción no encontrada',
      });
    }

    return PublicacionAdopcionResponseDto.fromEntity(publicacion);
  }

  /**
   * Permite al dueño cancelar/retirar su propia publicación de adopción.
   * Solo posible si la publicación está ACTIVA.
   */
  async cancelar(
    idUsuario: number,
    idPublicacion: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { idPublicacion, usuario: { idUsuario } },
      relations: ['mascota'],
    });

    if (!publicacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Publicación de adopción no encontrada',
      });
    }

    if (publicacion.estado !== AdopcionStatus.ACTIVA) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Solo se pueden cancelar publicaciones activas',
      });
    }

    publicacion.estado = AdopcionStatus.CANCELADA;
    const guardada = await this.publicacionesRepository.save(publicacion);
    return PublicacionAdopcionResponseDto.fromEntity(guardada);
  }
}

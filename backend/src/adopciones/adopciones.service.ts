import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { AdopcionStatus } from '../common/enums/adopcion-status.enum';
import {
  MENSAJE_TELEFONO_REQUERIDO,
  tieneCodigoPais,
} from '../common/utils/telefono.util';
import { DescarteAdopcion } from '../descartes/entities/descarte-adopcion.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { SolicitudAdopcion } from '../solicitudes-adopcion/entities/solicitud-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { CreatePublicacionAdopcionDto } from './dto/create-publicacion-adopcion.dto';
import { FiltrosAdopcionDto } from './dto/filtros-adopcion.dto';
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
    @InjectRepository(SolicitudAdopcion)
    private readonly solicitudesRepository: Repository<SolicitudAdopcion>,
    @InjectRepository(DescarteAdopcion)
    private readonly descartesRepository: Repository<DescarteAdopcion>,
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

    // La foto es lo primero que mira quien busca adoptar: sin foto la
    // publicación no sirve, así que se exige antes de crearla.
    if (!mascota.foto) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La mascota necesita una foto para publicarse en adopción',
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

    if (!tieneCodigoPais(usuario.telefono)) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: MENSAJE_TELEFONO_REQUERIDO,
      });
    }

    const publicacion = this.publicacionesRepository.create({
      mascota,
      usuario,
      descripcion: dto.descripcion,
      estado: AdopcionStatus.ACTIVA,
      tamano: dto.tamano ?? null,
      vacunado: dto.vacunado ?? false,
      compatiblePerros: dto.compatiblePerros ?? false,
      compatibleGatos: dto.compatibleGatos ?? false,
      compatibleNinos: dto.compatibleNinos ?? false,
      necesitaPatio: dto.necesitaPatio ?? false,
      ubicacion: dto.ubicacion ?? null,
    });
    const guardada = await this.publicacionesRepository.save(publicacion);
    guardada.mascota = mascota;

    return PublicacionAdopcionResponseDto.fromEntity(guardada);
  }

  /**
   * Lista las publicaciones de adopción activas de otros usuarios, más
   * recientes primero. Excluye las publicaciones propias y aquellas que el
   * usuario ya solicitó, para no volver a ofrecerlas en el descubrimiento.
   * Acepta filtros opcionales (especie, tamaño, sexo, vacunación, etc.).
   */
  async findAll(
    idUsuario: number,
    filtros: FiltrosAdopcionDto = {},
  ): Promise<PublicacionAdopcionResponseDto[]> {
    const where: FindOptionsWhere<PublicacionAdopcion> = {
      estado: AdopcionStatus.ACTIVA,
      usuario: { idUsuario: Not(idUsuario) },
    };

    if (filtros.tamano) where.tamano = filtros.tamano;
    if (filtros.vacunado !== undefined) where.vacunado = filtros.vacunado;
    if (filtros.compatiblePerros !== undefined)
      where.compatiblePerros = filtros.compatiblePerros;
    if (filtros.compatibleGatos !== undefined)
      where.compatibleGatos = filtros.compatibleGatos;
    if (filtros.compatibleNinos !== undefined)
      where.compatibleNinos = filtros.compatibleNinos;
    if (filtros.necesitaPatio !== undefined)
      where.necesitaPatio = filtros.necesitaPatio;

    const mascotaWhere: FindOptionsWhere<Mascota> = {};
    if (filtros.especie) mascotaWhere.especie = filtros.especie;
    if (filtros.sexo) mascotaWhere.sexo = filtros.sexo;
    if (filtros.esterilizado !== undefined)
      mascotaWhere.esterilizado = filtros.esterilizado;
    if (Object.keys(mascotaWhere).length > 0) {
      where.mascota = mascotaWhere;
    }

    const [solicitadas, descartadas] = await Promise.all([
      this.solicitudesRepository.find({
        where: { solicitante: { idUsuario } },
        relations: ['publicacion'],
      }),
      this.descartesRepository.find({
        where: { usuario: { idUsuario } },
        relations: ['publicacion'],
      }),
    ]);
    const idsExcluidos = [
      ...solicitadas.map((solicitud) => solicitud.publicacion.idPublicacion),
      ...descartadas.map((descarte) => descarte.publicacion.idPublicacion),
    ];
    if (idsExcluidos.length > 0) {
      where.idPublicacion = Not(In(idsExcluidos));
    }

    const publicaciones = await this.publicacionesRepository.find({
      where,
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
    const publicacion = await this.findPropia(idUsuario, idPublicacion);

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

  /**
   * Pausa una publicación activa: deja de aparecer en el descubrimiento
   * (swipe) y no se pueden generar nuevas solicitudes, pero se conserva en
   * "Mis publicaciones" para reanudarla más adelante.
   */
  async pausar(
    idUsuario: number,
    idPublicacion: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    const publicacion = await this.findPropia(idUsuario, idPublicacion);

    if (publicacion.estado !== AdopcionStatus.ACTIVA) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Solo se pueden pausar publicaciones activas',
      });
    }

    publicacion.estado = AdopcionStatus.PAUSADA;
    const guardada = await this.publicacionesRepository.save(publicacion);
    return PublicacionAdopcionResponseDto.fromEntity(guardada);
  }

  async reanudar(
    idUsuario: number,
    idPublicacion: number,
  ): Promise<PublicacionAdopcionResponseDto> {
    const publicacion = await this.findPropia(idUsuario, idPublicacion);

    if (publicacion.estado !== AdopcionStatus.PAUSADA) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Solo se pueden reanudar publicaciones pausadas',
      });
    }

    publicacion.estado = AdopcionStatus.ACTIVA;
    const guardada = await this.publicacionesRepository.save(publicacion);
    return PublicacionAdopcionResponseDto.fromEntity(guardada);
  }

  private async findPropia(
    idUsuario: number,
    idPublicacion: number,
  ): Promise<PublicacionAdopcion> {
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

    return publicacion;
  }
}

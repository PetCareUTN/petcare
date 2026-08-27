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
import { SolicitudAdopcionEstado } from '../common/enums/solicitud-adopcion-estado.enum';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { CreateSolicitudAdopcionDto } from './dto/create-solicitud-adopcion.dto';
import { RechazarSolicitudAdopcionDto } from './dto/rechazar-solicitud-adopcion.dto';
import { SolicitudAdopcionResponseDto } from './dto/solicitud-adopcion-response.dto';
import { SolicitudAdopcion } from './entities/solicitud-adopcion.entity';

@Injectable()
export class SolicitudesAdopcionService {
  constructor(
    @InjectRepository(SolicitudAdopcion)
    private readonly solicitudesRepository: Repository<SolicitudAdopcion>,
    @InjectRepository(PublicacionAdopcion)
    private readonly publicacionesRepository: Repository<PublicacionAdopcion>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Registra una solicitud de adopción sobre una publicación activa. No
   * permite que el dueño de la publicación se autosolicite, ni más de una
   * solicitud pendiente del mismo usuario sobre la misma publicación.
   */
  async solicitar(
    idUsuario: number,
    dto: CreateSolicitudAdopcionDto,
  ): Promise<SolicitudAdopcionResponseDto> {
    const publicacion = await this.publicacionesRepository.findOne({
      where: { idPublicacion: dto.idPublicacion, estado: AdopcionStatus.ACTIVA },
      relations: ['mascota', 'usuario'],
    });

    if (!publicacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Publicación de adopción no encontrada',
      });
    }

    if (publicacion.usuario.idUsuario === idUsuario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No podés solicitar la adopción de tu propia publicación',
      });
    }

    const solicitudPendiente = await this.solicitudesRepository.findOne({
      where: {
        publicacion: { idPublicacion: dto.idPublicacion },
        solicitante: { idUsuario },
        estado: SolicitudAdopcionEstado.PENDIENTE,
      },
    });
    if (solicitudPendiente) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Ya tenés una solicitud pendiente para esta publicación',
      });
    }

    const solicitante = await this.usersRepository.findOne({
      where: { idUsuario },
    });
    if (!solicitante) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'No autorizado',
      });
    }

    const solicitud = this.solicitudesRepository.create({
      publicacion,
      solicitante,
      estado: SolicitudAdopcionEstado.PENDIENTE,
    });
    const guardada = await this.solicitudesRepository.save(solicitud);
    guardada.publicacion = publicacion;
    guardada.solicitante = solicitante;

    return SolicitudAdopcionResponseDto.fromEntity(guardada);
  }

  /**
   * Solicitudes recibidas sobre publicaciones del usuario autenticado, para
   * que pueda gestionarlas (aceptar o rechazar).
   */
  async findRecibidas(
    idUsuario: number,
  ): Promise<SolicitudAdopcionResponseDto[]> {
    const solicitudes = await this.solicitudesRepository.find({
      where: { publicacion: { usuario: { idUsuario } } },
      relations: ['publicacion', 'publicacion.mascota', 'solicitante'],
      order: { createdAt: 'DESC' },
    });

    return solicitudes.map((solicitud) =>
      SolicitudAdopcionResponseDto.fromEntity(solicitud),
    );
  }

  /**
   * Solicitudes realizadas por el usuario autenticado, para que pueda
   * ver el estado de cada una (PENDIENTE/ACEPTADA/RECHAZADA).
   */
  async findMisSolicitudes(
    idUsuario: number,
  ): Promise<SolicitudAdopcionResponseDto[]> {
    const solicitudes = await this.solicitudesRepository.find({
      where: { solicitante: { idUsuario } },
      relations: ['publicacion', 'publicacion.mascota', 'publicacion.usuario', 'solicitante'],
      order: { createdAt: 'DESC' },
    });

    return solicitudes.map((solicitud) =>
      SolicitudAdopcionResponseDto.fromEntity(solicitud),
    );
  }

  async aceptar(
    idUsuario: number,
    idSolicitud: number,
  ): Promise<SolicitudAdopcionResponseDto> {
    const solicitud = await this.findSolicitudPropiaPendiente(
      idUsuario,
      idSolicitud,
    );
    solicitud.estado = SolicitudAdopcionEstado.ACEPTADA;
    solicitud.motivoRechazo = null;

    // Cerrar la publicación asociada (adopción completada)
    const publicacion = solicitud.publicacion;
    publicacion.estado = AdopcionStatus.CERRADA;
    await this.publicacionesRepository.save(publicacion);

    return SolicitudAdopcionResponseDto.fromEntity(
      await this.solicitudesRepository.save(solicitud),
    );
  }

  async rechazar(
    idUsuario: number,
    idSolicitud: number,
    dto: RechazarSolicitudAdopcionDto,
  ): Promise<SolicitudAdopcionResponseDto> {
    const solicitud = await this.findSolicitudPropiaPendiente(
      idUsuario,
      idSolicitud,
    );
    solicitud.estado = SolicitudAdopcionEstado.RECHAZADA;
    solicitud.motivoRechazo = dto.motivoRechazo.trim();
    return SolicitudAdopcionResponseDto.fromEntity(
      await this.solicitudesRepository.save(solicitud),
    );
  }

  private async findSolicitudPropiaPendiente(
    idUsuario: number,
    idSolicitud: number,
  ): Promise<SolicitudAdopcion> {
    const solicitud = await this.solicitudesRepository.findOne({
      where: { idSolicitud },
      relations: ['publicacion', 'publicacion.mascota', 'publicacion.usuario', 'solicitante'],
    });

    if (!solicitud) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'Solicitud de adopción no encontrada',
      });
    }

    if (solicitud.publicacion.usuario.idUsuario !== idUsuario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'No tenés permisos para gestionar esta solicitud',
      });
    }

    if (solicitud.estado !== SolicitudAdopcionEstado.PENDIENTE) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Solo se pueden gestionar solicitudes pendientes',
      });
    }

    return solicitud;
  }
}

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
import { NotificationType } from '../common/enums/notification-type.enum';
import { SolicitudAdopcionEstado } from '../common/enums/solicitud-adopcion-estado.enum';
import {
  MENSAJE_TELEFONO_REQUERIDO,
  tieneCodigoPais,
} from '../common/utils/telefono.util';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { User } from '../users/entities/user.entity';
import { CreateSolicitudAdopcionDto } from './dto/create-solicitud-adopcion.dto';
import { RechazarSolicitudAdopcionDto } from './dto/rechazar-solicitud-adopcion.dto';
import { SolicitudAdopcionResponseDto } from './dto/solicitud-adopcion-response.dto';
import { SolicitudAdopcion } from './entities/solicitud-adopcion.entity';

const RELACIONES_SOLICITUD = [
  'publicacion',
  'publicacion.mascota',
  'publicacion.usuario',
  'solicitante',
];

@Injectable()
export class SolicitudesAdopcionService {
  constructor(
    @InjectRepository(SolicitudAdopcion)
    private readonly solicitudesRepository: Repository<SolicitudAdopcion>,
    @InjectRepository(PublicacionAdopcion)
    private readonly publicacionesRepository: Repository<PublicacionAdopcion>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificacionesService: NotificacionesService,
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

    if (!tieneCodigoPais(solicitante.telefono)) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: MENSAJE_TELEFONO_REQUERIDO,
      });
    }

    const solicitud = this.solicitudesRepository.create({
      publicacion,
      solicitante,
      estado: SolicitudAdopcionEstado.PENDIENTE,
      tipoVivienda: dto.tipoVivienda ?? null,
      tienePatio: dto.tienePatio ?? null,
      tieneOtrasMascotas: dto.tieneOtrasMascotas ?? null,
      tieneNinos: dto.tieneNinos ?? null,
      tuvoMascotasAntes: dto.tuvoMascotasAntes ?? null,
      motivo: dto.motivo ?? null,
      informacionAdicional: dto.informacionAdicional ?? null,
    });
    const guardada = await this.solicitudesRepository.save(solicitud);
    guardada.publicacion = publicacion;
    guardada.solicitante = solicitante;

    await this.notificacionesService.crear(
      publicacion.usuario.idUsuario,
      NotificationType.SOLICITUD_RECIBIDA,
      'Nueva solicitud de adopción',
      `Alguien está interesado en adoptar a ${publicacion.mascota.nombre}.`,
    );

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
      relations: RELACIONES_SOLICITUD,
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
      relations: RELACIONES_SOLICITUD,
      order: { createdAt: 'DESC' },
    });

    return solicitudes.map((solicitud) =>
      SolicitudAdopcionResponseDto.fromEntity(solicitud),
    );
  }

  /**
   * Matches: solicitudes ya aceptadas donde el usuario participa, sea como
   * adoptante o como dueño de la publicación. No existe una tabla separada
   * de "match": una solicitud ACEPTADA ya representa exactamente eso.
   */
  async findMatches(idUsuario: number): Promise<SolicitudAdopcionResponseDto[]> {
    const solicitudes = await this.solicitudesRepository.find({
      where: [
        {
          solicitante: { idUsuario },
          estado: SolicitudAdopcionEstado.ACEPTADA,
        },
        {
          publicacion: { usuario: { idUsuario } },
          estado: SolicitudAdopcionEstado.ACEPTADA,
        },
      ],
      relations: RELACIONES_SOLICITUD,
      order: { updatedAt: 'DESC' },
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

    const guardada = await this.solicitudesRepository.save(solicitud);

    await this.notificacionesService.crear(
      solicitud.solicitante.idUsuario,
      NotificationType.APROBACION,
      '¡Hay match!',
      `El responsable de ${publicacion.mascota.nombre} aceptó tu solicitud de adopción.`,
    );

    return SolicitudAdopcionResponseDto.fromEntity(guardada);
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
    const guardada = await this.solicitudesRepository.save(solicitud);

    await this.notificacionesService.crear(
      solicitud.solicitante.idUsuario,
      NotificationType.RECHAZO,
      'Solicitud de adopción rechazada',
      `Tu solicitud para adoptar a ${solicitud.publicacion.mascota.nombre} no fue aceptada.`,
    );

    return SolicitudAdopcionResponseDto.fromEntity(guardada);
  }

  private async findSolicitudPropiaPendiente(
    idUsuario: number,
    idSolicitud: number,
  ): Promise<SolicitudAdopcion> {
    const solicitud = await this.solicitudesRepository.findOne({
      where: { idSolicitud },
      relations: RELACIONES_SOLICITUD,
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

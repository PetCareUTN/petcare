import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import {
  Notificacion,
  TipoReferenciaNotificacion,
} from './entities/notificacion.entity';
import { NotificacionResponseDto } from './dto/notificacion-response.dto';
import { DispositivosPushService } from './dispositivos-push.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionesRepository: Repository<Notificacion>,
    private readonly dispositivosPushService: DispositivosPushService,
  ) {}

  async crear(
    idUsuario: number,
    tipo: NotificationType,
    titulo: string,
    cuerpo: string,
    /** Id del registro que abre la notificación al tocarla (ver la entidad). */
    idReferencia: number | null = null,
    tipoReferencia: TipoReferenciaNotificacion | null = null,
  ): Promise<NotificacionResponseDto> {
    const notificacion = this.notificacionesRepository.create({
      usuario: { idUsuario },
      tipo,
      titulo,
      cuerpo,
      leida: false,
      idReferencia,
      tipoReferencia,
    });

    const guardada = await this.notificacionesRepository.save(notificacion);
    const dto = NotificacionResponseDto.fromEntity(guardada);

    // El push sale de acá y no de cada service de dominio porque todas las
    // notificaciones pasan por este método: así turnos, vacunas, detecciones y
    // las que vengan después quedan cubiertas sin tocarlas una por una.
    // El try va acá además de adentro del envío: esta es la garantía que
    // importa —la notificación interna ya está guardada— y no tiene que
    // depender de que el canal push se porte bien.
    try {
      await this.dispositivosPushService.enviarNotificacion(idUsuario, dto);
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el push de la notificación ${dto.idNotificacion}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return dto;
  }

  async listarPorUsuario(
    idUsuario: number,
  ): Promise<NotificacionResponseDto[]> {
    const notificaciones = await this.notificacionesRepository.find({
      where: { usuario: { idUsuario } },
      order: { fechaEnvio: 'DESC' },
    });

    return notificaciones.map((n) => NotificacionResponseDto.fromEntity(n));
  }

  /** Marca como leídas todas las notificaciones sin leer del usuario. */
  async marcarTodasLeidas(idUsuario: number) {
    const { affected } = await this.notificacionesRepository.update(
      { usuario: { idUsuario }, leida: false },
      { leida: true },
    );

    return {
      mensaje: 'Notificaciones marcadas como leídas',
      cantidad: affected ?? 0,
    };
  }

  async marcarLeida(idNotificacion: number, idUsuario: number) {
    const notificacion = await this.notificacionesRepository.findOne({
      where: { idNotificacion, usuario: { idUsuario } },
    });

    if (!notificacion) {
      throw new NotFoundException({
        codigoEstado: 404,
        mensaje: 'No se encontró la notificación',
      });
    }

    notificacion.leida = true;
    await this.notificacionesRepository.save(notificacion);

    return { mensaje: 'Notificación marcada como leída' };
  }
}

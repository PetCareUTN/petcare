import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesService } from './notificaciones.service';

/**
 * Ventana en la que dos avisos de separación de la misma mascota se consideran
 * el mismo episodio.
 *
 * El celular ya avisa una sola vez por episodio (ver `DetectorDeSeparacion`),
 * así que esto no es la defensa principal sino una red por si ese estado se
 * pierde: vive en memoria, y si Android mata el proceso mientras la mascota
 * sigue lejos, al volver vuelve a contar desde cero y avisaría de nuevo por una
 * separación que el dueño ya vio.
 *
 * Es corta a propósito. Un episodio nuevo de verdad exige que el tag se haya
 * vuelto a ver, o sea que la mascota volvió y se fue otra vez; que eso pase dos
 * veces en un cuarto de hora es raro, pero si pasa importa, y una ventana larga
 * lo taparía.
 */
const VENTANA_EPISODIO_MINUTOS = Number(
  process.env.SEPARACION_VENTANA_AVISO_MINUTOS ?? 15,
);

/** Datos del aviso, ya resueltos por quien lo dispara. */
export interface DatosSeparacion {
  /** Dueño de la mascota: es el único que recibe el aviso. */
  idUsuario: number;
  idMascota: number;
  nombreMascota: string | null;
}

/**
 * Deja en el historial del dueño el aviso de que su mascota se alejó (US-34).
 *
 * El celular ya muestra una notificación local en el momento, pero esa es
 * efímera: si el dueño no llega a verla, desaparece sin dejar rastro. Este
 * aviso queda en la campanita, y al tocarlo se abre el reporte de pérdida de
 * esa mascota, que es lo que el dueño va a querer hacer a continuación. Por eso
 * `idReferencia` es el id de la **mascota** y no el de un reporte: cuando llega
 * este aviso todavía no existe ningún reporte, justamente.
 *
 * Los fallos se registran pero no se propagan, igual que en las notificaciones
 * de detecciones: la alerta local ya se mostró en el celular, y no tiene
 * sentido devolverle un error a la app por un aviso que no se pudo escribir.
 */
@Injectable()
export class NotificacionesSeparacionService {
  private readonly logger = new Logger(NotificacionesSeparacionService.name);

  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionesRepository: Repository<Notificacion>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Devuelve si se creó el aviso. `false` significa que ya había uno de esta
   * mascota dentro de la ventana y se tomó como el mismo episodio.
   */
  async notificarSeparacion(datos: DatosSeparacion): Promise<boolean> {
    try {
      if (await this.yaSeAviso(datos.idMascota)) {
        return false;
      }

      const nombre = datos.nombreMascota ?? 'Tu mascota';
      await this.notificacionesService.crear(
        datos.idUsuario,
        NotificationType.MASCOTA_SEPARADA,
        `${nombre} se alejó`,
        'Hace un rato que su tag no se detecta cerca tuyo. ' +
          'Si no la encontrás, abrí este aviso para reportarla como perdida.',
        datos.idMascota,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo notificar la separación de la mascota ${datos.idMascota}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private async yaSeAviso(idMascota: number): Promise<boolean> {
    const desde = new Date(Date.now() - VENTANA_EPISODIO_MINUTOS * 60 * 1000);

    const reciente = await this.notificacionesRepository.findOne({
      where: {
        tipo: NotificationType.MASCOTA_SEPARADA,
        idReferencia: idMascota,
        fechaEnvio: MoreThan(desde),
      },
    });

    return reciente !== null;
  }
}

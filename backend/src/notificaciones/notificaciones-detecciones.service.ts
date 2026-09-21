import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesService } from './notificaciones.service';

/**
 * Cuánto tiempo se agrupan las detecciones de una misma mascota en un solo
 * aviso.
 *
 * Una mascota que pasa por una zona concurrida puede ser detectada muchas veces
 * en pocos minutos, y un aviso por cada una haría que el dueño silencie las
 * notificaciones justo cuando más las necesita. Media hora es corto frente al
 * tiempo que lleva llegar a un lugar, así que agrupar no le hace perder nada
 * accionable: la pantalla de última ubicación siempre muestra la detección más
 * reciente, aunque no se haya notificado.
 */
const VENTANA_AGRUPACION_MINUTOS = Number(
  process.env.DETECCIONES_VENTANA_AVISO_MINUTOS ?? 30,
);

/** Datos que necesita el aviso, ya resueltos por quien lo dispara. */
export interface DatosDeteccion {
  idReporte: number;
  /** Dueño que hizo el reporte: es el único que recibe el aviso. */
  idDuenio: number;
  nombreMascota: string | null;
  detectadoEn: Date;
}

/**
 * Avisa al dueño cuando la red colaborativa detecta su mascota perdida (US-41).
 *
 * Los fallos al notificar se registran pero no se propagan, igual que en las
 * notificaciones de turnos: la detección ya quedó guardada y es lo que importa,
 * no tiene sentido devolver un error por un aviso que no se pudo escribir.
 */
@Injectable()
export class NotificacionesDeteccionesService {
  private readonly logger = new Logger(NotificacionesDeteccionesService.name);

  constructor(
    @InjectRepository(Notificacion)
    private readonly notificacionesRepository: Repository<Notificacion>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Devuelve si se creó el aviso. `false` significa que la detección entró
   * dentro de la ventana de una notificación anterior y se agrupó con ella.
   */
  async notificarDeteccion(datos: DatosDeteccion): Promise<boolean> {
    try {
      if (await this.yaSeAviso(datos.idReporte)) {
        return false;
      }

      const nombre = datos.nombreMascota ?? 'tu mascota';
      await this.notificacionesService.crear(
        datos.idDuenio,
        NotificationType.MASCOTA_DETECTADA,
        `Detectaron a ${nombre} cerca`,
        `La red colaborativa la detectó a las ${this.hora(datos.detectadoEn)}. ` +
          'Abrí el aviso para ver la última ubicación conocida.',
        datos.idReporte,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo notificar la detección del reporte ${datos.idReporte}`,
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  /**
   * Si hay un aviso de este mismo reporte dentro de la ventana, esta detección
   * se agrupa con aquel.
   *
   * Se mira la tabla de notificaciones y no un contador aparte para que no
   * puedan quedar desincronizados: lo que decide es exactamente lo último que
   * vio el dueño.
   */
  private async yaSeAviso(idReporte: number): Promise<boolean> {
    const desde = new Date(Date.now() - VENTANA_AGRUPACION_MINUTOS * 60 * 1000);

    const reciente = await this.notificacionesRepository.findOne({
      where: {
        tipo: NotificationType.MASCOTA_DETECTADA,
        idReferencia: idReporte,
        fechaEnvio: MoreThan(desde),
      },
    });

    return reciente !== null;
  }

  /** Hora local en formato HH:MM, que es lo que pide el criterio de aceptación. */
  private hora(fecha: Date): string {
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

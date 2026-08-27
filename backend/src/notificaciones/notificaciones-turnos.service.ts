import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificacionesService } from './notificaciones.service';

/** Quién de las dos partes de un turno ejecutó la acción. */
export type ParteTurno = 'duenio' | 'prestador';

/**
 * Datos mínimos de un turno para redactar sus notificaciones, iguales para
 * turnos veterinarios y de servicios.
 */
export interface DatosTurno {
  idDuenio: number;
  idPrestador: number;
  nombreDuenio: string;
  nombrePrestador: string;
  nombreMascota: string;
  /** Formato YYYY-MM-DD */
  fecha: string;
  /** Formato HH:MM o HH:MM:SS (Postgres devuelve los segundos). */
  hora: string;
  /** Texto legible del turno, por ejemplo "consulta veterinaria" o "paseo". */
  servicio: string;
}

/**
 * Centraliza el registro de notificaciones de turnos (US-22) para que los
 * services de turnos no repitan la redacción de los mensajes. Los fallos al
 * notificar se registran pero no se propagan: un turno válido nunca debe
 * fallar porque no se pudo guardar su notificación.
 *
 * Es además el punto único donde más adelante se pueden sumar otros canales
 * de envío (WhatsApp, mail, push) sin tocar los services de turnos.
 */
@Injectable()
export class NotificacionesTurnosService {
  private readonly logger = new Logger(NotificacionesTurnosService.name);

  constructor(private readonly notificacionesService: NotificacionesService) {}

  /**
   * Turno dado de alta. Con el turnero automático el turno nace confirmado,
   * así que se notifica a las dos partes en el mismo momento.
   */
  async notificarTurnoConfirmado(turno: DatosTurno): Promise<void> {
    const cuando = `${this.formatearFecha(turno.fecha)} a las ${this.formatearHora(turno.hora)}`;

    await this.registrar(
      turno.idDuenio,
      NotificationType.TURNO_CONFIRMADO,
      'Turno confirmado',
      `Tu turno de ${turno.servicio} para ${turno.nombreMascota} con ${turno.nombrePrestador} quedó confirmado para el ${cuando}.`,
    );

    await this.registrar(
      turno.idPrestador,
      NotificationType.TURNO_CONFIRMADO,
      'Nuevo turno reservado',
      `${turno.nombreDuenio} reservó un turno de ${turno.servicio} para ${turno.nombreMascota} el ${cuando}.`,
    );
  }

  /**
   * Turno cancelado. Solo se notifica a la contraparte: quien canceló ya
   * conoce el cambio porque lo ejecutó.
   */
  async notificarTurnoCancelado(
    turno: DatosTurno,
    canceladoPor: ParteTurno,
    motivo: string | null,
  ): Promise<void> {
    const cuando = `${this.formatearFecha(turno.fecha)} a las ${this.formatearHora(turno.hora)}`;
    const esDuenio = canceladoPor === 'duenio';
    const destinatario = esDuenio ? turno.idPrestador : turno.idDuenio;
    const quienCancelo = esDuenio ? turno.nombreDuenio : turno.nombrePrestador;
    const detalleMotivo = motivo ? ` Motivo: ${motivo}` : '';

    await this.registrar(
      destinatario,
      NotificationType.TURNO_CANCELADO,
      'Turno cancelado',
      `${quienCancelo} canceló el turno de ${turno.servicio} para ${turno.nombreMascota} del ${cuando}.${detalleMotivo}`,
    );
  }

  private async registrar(
    idUsuario: number,
    tipo: NotificationType,
    titulo: string,
    cuerpo: string,
  ): Promise<void> {
    try {
      await this.notificacionesService.crear(idUsuario, tipo, titulo, cuerpo);
    } catch (error) {
      this.logger.warn(
        `No se pudo registrar la notificación "${titulo}" para el usuario ${idUsuario}: ${error}`,
      );
    }
  }

  /** Pasa una fecha YYYY-MM-DD al formato DD/MM/YYYY que se muestra al usuario. */
  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  /** Recorta los segundos que agrega Postgres a las columnas `time`. */
  private formatearHora(hora: string): string {
    return hora.slice(0, 5);
  }
}

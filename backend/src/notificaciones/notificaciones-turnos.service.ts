import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../common/enums/notification-type.enum';
import { TipoReferenciaNotificacion } from './entities/notificacion.entity';
import { NotificacionesService } from './notificaciones.service';

/** Quién de las dos partes de un turno ejecutó la acción. */
export type ParteTurno = 'duenio' | 'prestador';

/** Un dueño de la mascota del turno. */
export interface DuenioTurno {
  idUsuario: number;
  nombre: string;
}

/**
 * Datos mínimos de un turno para redactar sus notificaciones, iguales para
 * turnos veterinarios y de servicios.
 */
export interface DatosTurno {
  /** Id del turno y de qué tabla es: la notificación abre ese turno en la app. */
  idTurno: number;
  tipoTurno: TipoReferenciaNotificacion;
  /** Dueño que reservó el turno. */
  idDuenio: number;
  idPrestador: number;
  nombreDuenio: string;
  /**
   * Todos los dueños de la mascota (una mascota compartida tiene varios). Si no
   * viene, se toma solo a quien reservó. Todos reciben los avisos del turno.
   */
  duenios?: DuenioTurno[];
  nombrePrestador: string;
  nombreMascota: string;
  /** Formato YYYY-MM-DD */
  fecha: string;
  /** Formato HH:MM o HH:MM:SS (Postgres devuelve los segundos). */
  hora: string;
  /** Texto legible del turno, por ejemplo "consulta veterinaria" o "paseo". */
  servicio: string;
  /**
   * Quién cargó el turno. Si fue el prestador (agenda de la web), los dueños
   * reciben un aviso de que se les agendó un turno y el prestador no recibe
   * ninguno, porque lo acaba de cargar él.
   */
  creadoPor?: 'dueño' | 'veterinario';
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
   * así que se notifica a las dos partes en el mismo momento. Si la mascota
   * tiene varios dueños, el que reservó recibe el aviso con "tu turno" y los
   * demás con el nombre de quien lo reservó.
   */
  async notificarTurnoConfirmado(turno: DatosTurno): Promise<void> {
    const cuando = `${this.formatearFecha(turno.fecha)} a las ${this.formatearHora(turno.hora)}`;

    if (turno.creadoPor === 'veterinario') {
      for (const duenio of this.duenios(turno)) {
        await this.registrar(
          turno,
          duenio.idUsuario,
          NotificationType.TURNO_CONFIRMADO,
          'Turno confirmado',
          `${turno.nombrePrestador} te agendó un turno de ${turno.servicio} para ${turno.nombreMascota} el ${cuando}.`,
        );
      }
      return;
    }

    for (const duenio of this.duenios(turno)) {
      const loReservo = duenio.idUsuario === turno.idDuenio;
      await this.registrar(
        turno,
        duenio.idUsuario,
        NotificationType.TURNO_CONFIRMADO,
        'Turno confirmado',
        loReservo
          ? `Tu turno de ${turno.servicio} para ${turno.nombreMascota} con ${turno.nombrePrestador} quedó confirmado para el ${cuando}.`
          : `${turno.nombreDuenio} reservó un turno de ${turno.servicio} para ${turno.nombreMascota} con ${turno.nombrePrestador} el ${cuando}.`,
      );
    }

    await this.registrar(
      turno,
      turno.idPrestador,
      NotificationType.TURNO_CONFIRMADO,
      'Nuevo turno reservado',
      `${turno.nombreDuenio} reservó un turno de ${turno.servicio} para ${turno.nombreMascota} el ${cuando}.`,
    );
  }

  /**
   * Turno cancelado. Se notifica a todos menos a quien canceló, que ya conoce
   * el cambio porque lo ejecutó: si canceló un dueño, avisa al prestador y a
   * los demás dueños; si canceló el prestador, avisa a todos los dueños.
   *
   * @param idQuienCancelo Dueño que canceló, cuando fue uno de los dueños.
   *   Si no viene se toma a quien reservó.
   */
  async notificarTurnoCancelado(
    turno: DatosTurno,
    canceladoPor: ParteTurno,
    motivo: string | null,
    idQuienCancelo: number = turno.idDuenio,
  ): Promise<void> {
    const cuando = `${this.formatearFecha(turno.fecha)} a las ${this.formatearHora(turno.hora)}`;
    const esDuenio = canceladoPor === 'duenio';
    const detalleMotivo = motivo ? ` Motivo: ${motivo}` : '';
    const duenios = this.duenios(turno);

    const quienCancelo = esDuenio
      ? (duenios.find((d) => d.idUsuario === idQuienCancelo)?.nombre ??
        turno.nombreDuenio)
      : turno.nombrePrestador;

    const destinatarios = esDuenio
      ? [
          turno.idPrestador,
          ...duenios
            .filter((d) => d.idUsuario !== idQuienCancelo)
            .map((d) => d.idUsuario),
        ]
      : duenios.map((d) => d.idUsuario);

    for (const destinatario of destinatarios) {
      await this.registrar(
        turno,
        destinatario,
        NotificationType.TURNO_CANCELADO,
        'Turno cancelado',
        `${quienCancelo} canceló el turno de ${turno.servicio} para ${turno.nombreMascota} del ${cuando}.${detalleMotivo}`,
      );
    }
  }

  /** Dueños a avisar, sin repetidos; si no se informan, solo quien reservó. */
  private duenios(turno: DatosTurno): DuenioTurno[] {
    const lista = turno.duenios?.length
      ? turno.duenios
      : [{ idUsuario: turno.idDuenio, nombre: turno.nombreDuenio }];

    return lista.filter(
      (d, i) => lista.findIndex((o) => o.idUsuario === d.idUsuario) === i,
    );
  }

  private async registrar(
    turno: DatosTurno,
    idUsuario: number,
    tipo: NotificationType,
    titulo: string,
    cuerpo: string,
  ): Promise<void> {
    try {
      await this.notificacionesService.crear(
        idUsuario,
        tipo,
        titulo,
        cuerpo,
        turno.idTurno,
        turno.tipoTurno,
      );
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

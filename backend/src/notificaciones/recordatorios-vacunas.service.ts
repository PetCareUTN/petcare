import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, MoreThan, Not, Repository } from 'typeorm';
import { ClinicalEventType } from '../common/enums/clinical-event-type.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { TipoVacuna } from '../common/enums/tipo-vacuna.enum';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { NotificacionesService } from './notificaciones.service';

/**
 * Cuántos días antes del vencimiento se avisa.
 *
 * Es la "anticipación configurable" del criterio de aceptación, resuelta como
 * configuración del sistema y no por usuario: hoy no hay ninguna pantalla donde
 * cada dueño elija su propio plazo, y agregarla sería alcance nuevo. Si más
 * adelante se quiere por usuario, el lugar natural es la misma tabla donde vive
 * la preferencia de activar/desactivar.
 */
const DIAS_DE_ANTICIPACION = Number(process.env.VACUNAS_DIAS_ANTICIPACION ?? 15);

/** Nombre legible de cada vacuna, para el texto de la notificación. */
const NOMBRE_VACUNA: Record<TipoVacuna, string> = {
  [TipoVacuna.ANTIRRABICA]: 'antirrábica',
  [TipoVacuna.QUINTUPLE]: 'quíntuple',
  [TipoVacuna.SEXTUPLE]: 'séxtuple',
  [TipoVacuna.TRAQUEOBRONQUITIS]: 'traqueobronquitis',
  [TipoVacuna.TRIPLE_FELINA]: 'triple felina',
  [TipoVacuna.LEUCEMIA_FELINA]: 'leucemia felina',
};

/**
 * Avisa a los dueños antes de que venza una vacuna (US-40).
 *
 * Corre una vez por día. Es la primera tarea programada del backend: hasta
 * ahora todas las notificaciones nacían de una acción del usuario (se confirma
 * un turno, se acepta una adopción), y esta es la primera que la dispara el
 * paso del tiempo.
 *
 * No calcula fechas de vencimiento: usa la que cargó el veterinario al
 * registrar la vacuna. Toda la decisión clínica queda de ese lado.
 */
@Injectable()
export class RecordatoriosVacunasService {
  private readonly logger = new Logger(RecordatoriosVacunasService.name);

  constructor(
    @InjectRepository(EventoClinico)
    private readonly eventosClinicosRepository: Repository<EventoClinico>,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async enviarRecordatoriosDelDia(): Promise<void> {
    const enviados = await this.enviarRecordatorios();
    if (enviados > 0) {
      this.logger.log(`Recordatorios de vacunación enviados: ${enviados}`);
    }
  }

  /**
   * Devuelve cuántas dosis se notificaron.
   *
   * Es público y separado del método con `@Cron` para poder dispararlo en los
   * tests sin depender del reloj.
   */
  async enviarRecordatorios(hoy: Date = new Date()): Promise<number> {
    const pendientes = await this.buscarDosisPorVencer(hoy);

    let notificadas = 0;
    for (const evento of pendientes) {
      const yaReaplicada = await this.fueReaplicada(evento);
      if (yaReaplicada) {
        // La dosis ya se dio: se marca como avisada para que no la volvamos a
        // mirar todos los días, pero no se notifica.
        await this.marcarComoEnviado(evento);
        continue;
      }

      const aviso = await this.notificarDuenios(evento);
      await this.marcarComoEnviado(evento);
      if (aviso) {
        notificadas += 1;
      }
    }

    return notificadas;
  }

  /**
   * Dosis cuya próxima aplicación cae dentro de la ventana de anticipación y
   * de las que todavía no se avisó.
   *
   * A propósito no hay límite inferior: una dosis ya vencida de la que nunca se
   * avisó —porque el sistema estuvo caído, o porque la cargaron tarde— también
   * entra. Es mejor avisar tarde que no avisar, y como después se marca
   * `recordatorio_enviado_at`, igual se avisa una sola vez.
   */
  private async buscarDosisPorVencer(hoy: Date): Promise<EventoClinico[]> {
    const hasta = new Date(hoy);
    hasta.setDate(hasta.getDate() + DIAS_DE_ANTICIPACION);

    return this.eventosClinicosRepository.find({
      where: {
        tipo: ClinicalEventType.VACUNA,
        vacuna: Not(IsNull()),
        proximaAplicacion: LessThanOrEqual(this.aFecha(hasta)),
        recordatorioEnviadoAt: IsNull(),
      },
      relations: ['historia', 'historia.mascota', 'historia.mascota.usuarios'],
    });
  }

  /**
   * `true` si el dueño ya dio esta dosis.
   *
   * Se resuelve buscando un evento **posterior** de la misma vacuna en la misma
   * historia clínica. Funciona porque `vacuna` es un enum: dos registros de la
   * antirrábica son siempre el mismo valor, cosa que con el texto libre que
   * había antes era imposible de garantizar.
   */
  private async fueReaplicada(evento: EventoClinico): Promise<boolean> {
    const posteriores = await this.eventosClinicosRepository.count({
      where: {
        historia: { idHistoria: evento.historia.idHistoria },
        tipo: ClinicalEventType.VACUNA,
        vacuna: evento.vacuna!,
        fecha: MoreThan(evento.fecha),
      },
    });

    return posteriores > 0;
  }

  /**
   * Notifica a todos los dueños de la mascota que tengan los recordatorios
   * activados. Devuelve `true` si se avisó a alguno.
   *
   * Una mascota puede tener más de un dueño, y cada uno decide por su cuenta si
   * quiere recibir estos avisos.
   */
  private async notificarDuenios(evento: EventoClinico): Promise<boolean> {
    const mascota = evento.historia?.mascota;
    if (!mascota) {
      this.logger.warn(
        `El evento ${evento.idEvento} no tiene mascota asociada, se omite`,
      );
      return false;
    }

    const duenios = (mascota.usuarios ?? []).filter(
      (usuario) => usuario.recordatoriosVacunas,
    );
    if (duenios.length === 0) {
      return false;
    }

    const nombreVacuna = NOMBRE_VACUNA[evento.vacuna!] ?? 'vacuna';
    const cuando = this.formatearFecha(evento.proximaAplicacion!);
    const titulo = 'Recordatorio de vacunación';
    const cuerpo =
      `A ${mascota.nombre} le toca la ${nombreVacuna} el ${cuando}. ` +
      'Sacá turno con tu veterinario para mantener el calendario al día.';

    let alguno = false;
    for (const duenio of duenios) {
      try {
        await this.notificacionesService.crear(
          duenio.idUsuario,
          NotificationType.RECORDATORIO_VACUNA,
          titulo,
          cuerpo,
        );
        alguno = true;
      } catch (error) {
        // Un fallo al notificar no debe cortar el resto de los recordatorios
        // del día: se registra y se sigue.
        this.logger.error(
          `No se pudo notificar al usuario ${duenio.idUsuario}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return alguno;
  }

  private async marcarComoEnviado(evento: EventoClinico): Promise<void> {
    await this.eventosClinicosRepository.update(
      { idEvento: evento.idEvento },
      { recordatorioEnviadoAt: new Date() },
    );
  }

  /** `Date` a `YYYY-MM-DD`, que es como se guarda la columna. */
  private aFecha(fecha: Date): string {
    return fecha.toISOString().slice(0, 10);
  }

  /** `YYYY-MM-DD` a `DD/MM/YYYY`, para el texto que lee el dueño. */
  private formatearFecha(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}

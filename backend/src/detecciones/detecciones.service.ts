import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { distanciaEnMetros } from '../common/utils/distancia.util';
import { NotificacionesDeteccionesService } from '../notificaciones/notificaciones-detecciones.service';
import { ReportePerdida } from '../reportes-perdida/entities/reporte-perdida.entity';
import { ReportesPerdidaService } from '../reportes-perdida/reportes-perdida.service';
import { TagBle } from '../tags-ble/entities/tag-ble.entity';
import { User } from '../users/entities/user.entity';
import { RegistrarDeteccionDto } from './dto/registrar-deteccion.dto';
import { UltimaDeteccionResponseDto } from './dto/ultima-deteccion-response.dto';
import { Deteccion } from './entities/deteccion.entity';

/**
 * Margen para relojes de celular adelantados. Más allá de esto la fecha es
 * basura, y guardarla la dejaría como "última ubicación" para siempre.
 */
const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;

/**
 * Antigüedad máxima de una detección para generar un aviso preventivo
 * (P1-210). Un celular que estuvo horas sin red vacía su cola al reconectarse:
 * avisar "detectaron a tu mascota fuera de casa" por algo de hace medio día no
 * le sirve al dueño para actuar y solo lo asusta.
 */
const ANTIGUEDAD_MAXIMA_PREVENTIVA_MS = 60 * 60 * 1000;

/**
 * Cuánto se conservan las detecciones preventivas que no terminaron en un
 * reporte (P1-210). Son ubicaciones de una mascota que no estaba perdida: no
 * hay motivo para guardarlas más allá de lo que el dueño tarda en revisarlas.
 */
const RETENCION_PREVENTIVAS_DIAS = 7;

/**
 * Dos celulares pueden detectar el mismo tag en el mismo instante: es el caso
 * de triangulación que US-31 acepta a propósito. Entre esas, se muestra la de
 * menor `precisionMetros`, que es la que acota mejor dónde estaba. El id solo
 * desempata si además empatan en precisión.
 */
const ORDEN_ULTIMA_DETECCION = {
  detectadoEn: 'DESC',
  precisionMetros: 'ASC',
  idDeteccion: 'DESC',
} as const;

/** Qué pasó con una detección. El controller no lo expone: ver DeteccionesController. */
export type ResultadoDeteccion = 'registrada' | 'descartada' | 'duplicada';

@Injectable()
export class DeteccionesService {
  private readonly logger = new Logger(DeteccionesService.name);

  constructor(
    @InjectRepository(Deteccion)
    private readonly deteccionesRepository: Repository<Deteccion>,
    @InjectRepository(TagBle)
    private readonly tagsBleRepository: Repository<TagBle>,
    private readonly reportesPerdidaService: ReportesPerdidaService,
    private readonly notificacionesDeteccionesService: NotificacionesDeteccionesService,
  ) {}

  async registrar(dto: RegistrarDeteccionDto): Promise<ResultadoDeteccion> {
    const detectadoEn = new Date(dto.detectadoEn);
    if (detectadoEn.getTime() > Date.now() + TOLERANCIA_RELOJ_MS) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Campos obligatorios faltantes o inválidos',
      });
    }

    const tagBle = await this.tagsBleRepository.findOne({
      where: { tagId: dto.tagId },
      // Los dueños con su zona de casa los necesita el aviso preventivo.
      relations: ['mascota', 'mascota.usuarios'],
    });
    if (!tagBle) return 'descartada';

    const reporte = await this.reportesPerdidaService.buscarReporteActivo(
      tagBle.mascota.idMascota,
    );
    if (!reporte) return this.registrarPreventiva(dto, tagBle, detectadoEn);

    // Lo que el tag emitió antes de que el dueño lo viera por última vez es la
    // mascota en su casa: no ayuda a encontrarla y confundiría a US-37. Pasa
    // cuando un celular que estuvo sin red vacía su cola después del reporte.
    if (detectadoEn < reporte.fechaPerdida) return 'descartada';

    if (!(await this.insertar(dto, tagBle, detectadoEn, reporte))) {
      return 'duplicada';
    }

    // Solo se avisa por detecciones nuevas: un reintento del mismo celular no
    // es una novedad para el dueño. Las de mascotas con el reporte cerrado ya
    // se descartaron más arriba, así que nunca llegan hasta acá (US-41).
    await this.notificacionesDeteccionesService.notificarDeteccion({
      idReporte: reporte.idReporte,
      idsDuenios: this.idsDeLosDuenios(reporte),
      nombreMascota: reporte.mascota?.nombre ?? null,
      detectadoEn,
    });

    return 'registrada';
  }

  /**
   * Detección de una mascota que no está reportada como perdida (P1-210).
   *
   * Se guarda y se avisa solo si cae fuera de la zona de casa de **todos** los
   * dueños que la configuraron: para una mascota compartida, estar en la casa de
   * cualquiera de ellos es estar en casa. Dentro de la zona no se guarda nada,
   * que es la otra mitad del pedido: mientras está en casa no se registra dónde
   * está.
   *
   * La zona de casa es opcional para el dueño: sin ningún dueño que la haya
   * configurado, la detección se descarta como antes de P1-210.
   */
  private async registrarPreventiva(
    dto: RegistrarDeteccionDto,
    tagBle: TagBle,
    detectadoEn: Date,
  ): Promise<ResultadoDeteccion> {
    if (detectadoEn.getTime() < Date.now() - ANTIGUEDAD_MAXIMA_PREVENTIVA_MS) {
      return 'descartada';
    }

    // "Está conmigo": el dueño ya sabe que no está en casa.
    if (
      tagBle.avisosSilenciadosHasta &&
      tagBle.avisosSilenciadosHasta.getTime() > Date.now()
    ) {
      return 'descartada';
    }

    const conZona = (tagBle.mascota.usuarios ?? []).filter(tieneZonaCasa);
    if (conZona.length === 0) return 'descartada';

    const enAlgunaCasa = conZona.some((duenio) =>
      estaDentroDeLaZona(duenio, dto.latitud, dto.longitud),
    );
    if (enAlgunaCasa) return 'descartada';

    if (!(await this.insertar(dto, tagBle, detectadoEn, null))) {
      return 'duplicada';
    }

    await this.notificacionesDeteccionesService.notificarFueraDeCasa({
      idMascota: tagBle.mascota.idMascota,
      idsDuenios: conZona.map((duenio) => duenio.idUsuario),
      nombreMascota: tagBle.mascota.nombre ?? null,
      detectadoEn,
    });

    return 'registrada';
  }

  /**
   * Devuelve si se insertó. `false` es un reintento de una detección que ya
   * estaba guardada.
   */
  private async insertar(
    dto: RegistrarDeteccionDto,
    tagBle: TagBle,
    detectadoEn: Date,
    reporte: ReportePerdida | null,
  ): Promise<boolean> {
    // ON CONFLICT DO NOTHING sobre el índice único de deteccion_uuid: un
    // reintento del mismo celular no duplica, ni aunque lleguen dos a la vez.
    const resultado = await this.deteccionesRepository
      .createQueryBuilder()
      .insert()
      .into(Deteccion)
      .values({
        deteccionUuid: dto.deteccionId,
        reporte: reporte ? { idReporte: reporte.idReporte } : null,
        mascota: { idMascota: tagBle.mascota.idMascota },
        tagId: dto.tagId,
        rssi: dto.rssi,
        latitud: dto.latitud,
        longitud: dto.longitud,
        precisionMetros: dto.precisionMetros,
        detectadoEn,
      })
      .orIgnore()
      .execute();

    // `raw` son las filas del RETURNING: vacío si el ON CONFLICT no insertó.
    // (`identifiers` no sirve para esto: TypeORM lo arma por cada valor enviado.)
    const insertadas = resultado.raw as unknown[];
    return insertadas.length > 0;
  }

  /**
   * A quién avisar: a todos los dueños de la mascota, no solo a quien hizo el
   * reporte. Si por algún motivo la mascota no los trae, queda el del reporte.
   */
  private idsDeLosDuenios(reporte: ReportePerdida): number[] {
    const ids = (reporte.mascota?.usuarios ?? []).map((u) => u.idUsuario);
    return ids.length > 0 ? ids : [reporte.usuario.idUsuario];
  }

  /**
   * Última ubicación conocida de una mascota perdida (US-37).
   *
   * Ordena por `detectadoEn` y no por `created_at`: una detección puede llegar
   * tarde porque el celular la encoló mientras no tenía red, y lo que orienta la
   * búsqueda es cuándo se vio a la mascota, no cuándo entró la fila al servidor.
   *
   * El permiso lo resuelve `buscarReporteDelDuenio`, que tira 404 si el reporte
   * no existe y 403 si es de otro dueño.
   */
  async buscarUltimaDelReporte(
    idReporte: number,
    idUsuario: number,
  ): Promise<UltimaDeteccionResponseDto> {
    const reporte = await this.reportesPerdidaService.buscarReporteDelDuenio(
      idReporte,
      idUsuario,
    );

    const ultima = await this.deteccionesRepository.findOne({
      where: { reporte: { idReporte } },
      order: ORDEN_ULTIMA_DETECCION,
    });

    return UltimaDeteccionResponseDto.fromEntity(
      reporte.idReporte,
      reporte.mascota.idMascota,
      reporte.mascota.nombre ?? null,
      ultima,
    );
  }

  /**
   * Última detección de una mascota, tenga o no reporte (P1-210). La abre el
   * aviso preventivo, que referencia a la mascota porque todavía no hay reporte.
   *
   * El permiso lo resuelve `buscarMascotaDelDuenio`, con el mismo criterio que
   * los reportes de pérdida.
   */
  async buscarUltimaDeLaMascota(
    idMascota: number,
    idUsuario: number,
  ): Promise<UltimaDeteccionResponseDto> {
    const mascota = await this.reportesPerdidaService.buscarMascotaDelDuenio(
      idMascota,
      idUsuario,
    );

    const ultima = await this.deteccionesRepository.findOne({
      where: { mascota: { idMascota } },
      relations: ['reporte'],
      order: ORDEN_ULTIMA_DETECCION,
    });

    return UltimaDeteccionResponseDto.fromEntity(
      ultima?.reporte?.idReporte ?? null,
      mascota.idMascota,
      mascota.nombre ?? null,
      ultima,
    );
  }

  /** Borra las detecciones preventivas viejas que no terminaron en un reporte (P1-210). */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async limpiarPreventivasDelDia(): Promise<void> {
    const borradas = await this.limpiarPreventivasViejas();
    if (borradas > 0) {
      this.logger.log(`Detecciones preventivas borradas: ${borradas}`);
    }
  }

  /**
   * Devuelve cuántas se borraron. Separado del método con `@Cron` para poder
   * probarlo sin depender del reloj.
   */
  async limpiarPreventivasViejas(ahora: Date = new Date()): Promise<number> {
    const limite = new Date(
      ahora.getTime() - RETENCION_PREVENTIVAS_DIAS * 24 * 60 * 60 * 1000,
    );

    const resultado = await this.deteccionesRepository
      .createQueryBuilder()
      .delete()
      .from(Deteccion)
      .where('id_reporte IS NULL')
      .andWhere('detectado_en < :limite', { limite })
      .execute();

    return resultado.affected ?? 0;
  }
}

function tieneZonaCasa(usuario: User): boolean {
  return (
    usuario.casaLatitud !== null &&
    usuario.casaLatitud !== undefined &&
    usuario.casaLongitud !== null &&
    usuario.casaLongitud !== undefined &&
    usuario.casaRadioMetros !== null &&
    usuario.casaRadioMetros !== undefined
  );
}

/**
 * Se compara contra el punto que mandó el celular, sin sumarle la precisión del
 * GPS. El redondeo de ~110 m ya está contemplado en el radio mínimo de la zona
 * (ver GuardarZonaCasaDto).
 */
function estaDentroDeLaZona(
  duenio: User,
  latitud: number,
  longitud: number,
): boolean {
  const distancia = distanciaEnMetros(
    Number(duenio.casaLatitud),
    Number(duenio.casaLongitud),
    latitud,
    longitud,
  );
  return distancia <= Number(duenio.casaRadioMetros);
}

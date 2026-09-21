import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportesPerdidaService } from '../reportes-perdida/reportes-perdida.service';
import { TagBle } from '../tags-ble/entities/tag-ble.entity';
import { RegistrarDeteccionDto } from './dto/registrar-deteccion.dto';
import { UltimaDeteccionResponseDto } from './dto/ultima-deteccion-response.dto';
import { Deteccion } from './entities/deteccion.entity';

/**
 * Margen para relojes de celular adelantados. Más allá de esto la fecha es
 * basura, y guardarla la dejaría como "última ubicación" para siempre.
 */
const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;

/** Qué pasó con una detección. El controller no lo expone: ver DeteccionesController. */
export type ResultadoDeteccion = 'registrada' | 'descartada' | 'duplicada';

@Injectable()
export class DeteccionesService {
  constructor(
    @InjectRepository(Deteccion)
    private readonly deteccionesRepository: Repository<Deteccion>,
    @InjectRepository(TagBle)
    private readonly tagsBleRepository: Repository<TagBle>,
    private readonly reportesPerdidaService: ReportesPerdidaService,
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
      relations: ['mascota'],
    });
    if (!tagBle) return 'descartada';

    const reporte = await this.reportesPerdidaService.buscarReporteActivo(
      tagBle.mascota.idMascota,
    );
    if (!reporte) return 'descartada';

    // Lo que el tag emitió antes de que el dueño lo viera por última vez es la
    // mascota en su casa: no ayuda a encontrarla y confundiría a US-37. Pasa
    // cuando un celular que estuvo sin red vacía su cola después del reporte.
    if (detectadoEn < reporte.fechaPerdida) return 'descartada';

    // ON CONFLICT DO NOTHING sobre el índice único de deteccion_uuid: un
    // reintento del mismo celular no duplica, ni aunque lleguen dos a la vez.
    const resultado = await this.deteccionesRepository
      .createQueryBuilder()
      .insert()
      .into(Deteccion)
      .values({
        deteccionUuid: dto.deteccionId,
        reporte: { idReporte: reporte.idReporte },
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
    return insertadas.length > 0 ? 'registrada' : 'duplicada';
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
      // El id desempata dos lecturas con la misma marca de tiempo.
      order: { detectadoEn: 'DESC', idDeteccion: 'DESC' },
    });

    return UltimaDeteccionResponseDto.fromEntity(
      reporte.idReporte,
      reporte.mascota.idMascota,
      reporte.mascota.nombre ?? null,
      ultima,
    );
  }
}

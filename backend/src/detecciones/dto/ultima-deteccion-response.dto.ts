import { Deteccion } from '../entities/deteccion.entity';

/**
 * El celular redondea las coordenadas a 3 decimales antes de enviarlas (ver
 * `Deteccion.latitud`), lo que corre el punto hasta ~80 m respecto del real.
 * Se lo sumamos a la precisión que reportó el GPS para que el radio que ve el
 * dueño cubra la incertidumbre completa: US-37 pide explícitamente no dar una
 * precisión falsa, así que conviene errar por exceso.
 */
const MARGEN_REDONDEO_METROS = 80;

export class DeteccionResponseDto {
  latitud: number;
  longitud: number;
  /** Precisión que reportó el GPS del celular que detectó. */
  precisionMetros: number;
  /** Radio dentro del cual está la mascota: GPS + margen de redondeo. */
  radioAproximadoMetros: number;
  detectadoEn: string;
}

/**
 * Última ubicación conocida de una mascota perdida (US-37).
 *
 * `ultimaDeteccion` en `null` no es un error: es el caso de un reporte abierto
 * que todavía nadie cruzó. Se devuelve así, y no un 404, para que la app pueda
 * mostrar el estado vacío con el nombre de la mascota igual.
 */
export class UltimaDeteccionResponseDto {
  idReporte: number;
  idMascota: number;
  nombreMascota: string | null;
  ultimaDeteccion: DeteccionResponseDto | null;

  static fromEntity(
    idReporte: number,
    idMascota: number,
    nombreMascota: string | null,
    deteccion: Deteccion | null,
  ): UltimaDeteccionResponseDto {
    return {
      idReporte,
      idMascota,
      nombreMascota,
      ultimaDeteccion: deteccion
        ? {
            latitud: Number(deteccion.latitud),
            longitud: Number(deteccion.longitud),
            precisionMetros: deteccion.precisionMetros,
            radioAproximadoMetros:
              deteccion.precisionMetros + MARGEN_REDONDEO_METROS,
            detectadoEn: deteccion.detectadoEn.toISOString(),
          }
        : null,
    };
  }
}

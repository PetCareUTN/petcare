import { IsInt, IsNumber, Max, Min } from 'class-validator';
import { User } from '../entities/user.entity';

/**
 * El mínimo contempla que las detecciones llegan redondeadas a 3 decimales
 * (~110 m): con un radio menor, la mascota en el patio podría caer "afuera".
 */
export const RADIO_CASA_MINIMO_METROS = 100;
export const RADIO_CASA_MAXIMO_METROS = 1000;

/** Zona de casa que guarda el dueño (P1-209). */
export class GuardarZonaCasaDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;

  @IsInt()
  @Min(RADIO_CASA_MINIMO_METROS)
  @Max(RADIO_CASA_MAXIMO_METROS)
  radioMetros: number;
}

/**
 * Zona de casa del usuario autenticado. Se devuelve con `configurada: false` en
 * vez de un 404 o un cuerpo vacío: no tenerla es un estado normal, y la app
 * muestra la pantalla igual para que la cargue.
 */
export class ZonaCasaResponseDto {
  configurada: boolean;
  latitud: number | null;
  longitud: number | null;
  radioMetros: number | null;

  static fromEntity(user: User): ZonaCasaResponseDto {
    const configurada =
      user.casaLatitud !== null &&
      user.casaLongitud !== null &&
      user.casaRadioMetros !== null;
    return {
      configurada,
      latitud: configurada ? Number(user.casaLatitud) : null,
      longitud: configurada ? Number(user.casaLongitud) : null,
      radioMetros: configurada ? user.casaRadioMetros : null,
    };
  }
}

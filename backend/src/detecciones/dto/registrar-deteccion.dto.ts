import {
  IsISO8601,
  IsInt,
  IsNumber,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TAG_ID_REGEX } from '../../tags-ble/dto/vincular-tag-ble.dto';

/**
 * Contrato de detección que manda el celular (US-30 → US-31).
 *
 * Como el ValidationPipe global usa `forbidNonWhitelisted`, un request que traiga
 * cualquier campo extra (un userId, un token, un device id) se rechaza entero:
 * el endpoint no puede terminar guardando datos del detector por descuido.
 */
export class RegistrarDeteccionDto {
  @IsUUID('4')
  deteccionId: string;

  @Matches(TAG_ID_REGEX)
  tagId: string;

  /** Android reporta RSSI entre -127 y 20 dBm. */
  @IsInt()
  @Min(-127)
  @Max(20)
  rssi: number;

  @IsISO8601({ strict: true })
  detectadoEn: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;

  @IsInt()
  @Min(0)
  precisionMetros: number;
}

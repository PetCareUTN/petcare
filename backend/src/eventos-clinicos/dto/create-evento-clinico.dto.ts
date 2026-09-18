import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';
import { TipoVacuna } from '../../common/enums/tipo-vacuna.enum';

/**
 * Los campos llegan como HTML del editor de texto enriquecido del frontend,
 * que ya recorta el texto visible a 1000/500 caracteres. Estos límites son
 * más generosos para dejar margen al markup (negrita, listas, etc.) y actúan
 * como resguardo del lado del servidor si algo le pega directo a la API.
 */
const DESCRIPCION_MAX_LENGTH = 3000;
const CAMPO_CORTO_MAX_LENGTH = 1500;

export class CreateEventoClinicoDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  idMascota: number;

  @IsEnum(ClinicalEventType)
  tipo: ClinicalEventType;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(DESCRIPCION_MAX_LENGTH)
  descripcion: string;

  @IsString()
  @IsOptional()
  @MaxLength(CAMPO_CORTO_MAX_LENGTH)
  diagnostico?: string;

  @IsString()
  @IsOptional()
  @MaxLength(CAMPO_CORTO_MAX_LENGTH)
  tratamiento?: string;

  @IsString()
  @IsOptional()
  @MaxLength(CAMPO_CORTO_MAX_LENGTH)
  observaciones?: string;

  /*
   * Campos de vacunación (US-40). Obligatorios cuando el evento es de tipo
   * VACUNA e ignorados en cualquier otro tipo.
   */

  /**
   * Qué vacuna se aplicó.
   *
   * Es un enum y no texto libre porque el recordatorio compara dos registros
   * para saber si una dosis ya fue reaplicada, y eso exige que el valor sea
   * idéntico entre uno y otro.
   */
  @ValidateIf((dto: CreateEventoClinicoDto) => dto.tipo === ClinicalEventType.VACUNA)
  @IsEnum(TipoVacuna)
  vacuna?: TipoVacuna;

  /**
   * Fecha de la próxima dosis, que carga el veterinario.
   *
   * No se prellena ni se calcula: el esquema depende del animal. Un cachorro
   * recibe varias dosis separadas por semanas antes de pasar al esquema anual.
   */
  @ValidateIf((dto: CreateEventoClinicoDto) => dto.tipo === ClinicalEventType.VACUNA)
  @IsDateString()
  proximaAplicacion?: string;
}

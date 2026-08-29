import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';

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
}

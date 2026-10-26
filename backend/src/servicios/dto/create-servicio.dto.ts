import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';
import {
  DURACION_MAXIMA_MINUTOS,
  DURACION_MINIMA_MINUTOS,
} from '../duracion-servicio';
import { DisponibilidadDto } from './disponibilidad.dto';

export class CreateServicioDto {
  @IsEnum(CategoriaServicio)
  categoria: CategoriaServicio;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  descripcion?: string;

  /** Minutos que dura cada turno; si no viene, se usa el de la categoría. */
  @IsOptional()
  @IsInt()
  @Min(DURACION_MINIMA_MINUTOS)
  @Max(DURACION_MAXIMA_MINUTOS)
  duracionMinutos?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadDto)
  disponibilidades: DisponibilidadDto[];
}

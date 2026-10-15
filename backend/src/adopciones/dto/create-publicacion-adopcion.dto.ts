import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  MENSAJE_PROVINCIA_INVALIDA,
  PROVINCIAS_ARGENTINA,
} from '../../common/constants/provincias';
import { TamanoMascota } from '../../common/enums/tamano-mascota.enum';

export class CreatePublicacionAdopcionDto {
  @Type(() => Number)
  @IsInt()
  idMascota: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion: string;

  @IsOptional()
  @IsEnum(TamanoMascota)
  tamano?: TamanoMascota;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  vacunado?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  compatiblePerros?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  compatibleGatos?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  compatibleNinos?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  necesitaPatio?: boolean;

  /**
   * Provincia donde está la mascota. Obligatoria: es lo que permite que
   * alguien que busca adoptar filtre por su zona, y sin ella la publicación
   * quedaría invisible en ese filtro.
   */
  @IsString()
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  @IsIn(PROVINCIAS_ARGENTINA, { message: MENSAJE_PROVINCIA_INVALIDA })
  provincia: string;

  /** Detalle dentro de la provincia (barrio, ciudad). No se filtra por esto. */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  ubicacion?: string;
}

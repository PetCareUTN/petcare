import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import {
  MENSAJE_PROVINCIA_INVALIDA,
  PROVINCIAS_ARGENTINA,
} from '../../common/constants/provincias';
import { PetSex } from '../../common/enums/pet-sex.enum';
import { TamanoMascota } from '../../common/enums/tamano-mascota.enum';

export class FiltrosAdopcionDto {
  @IsOptional()
  @IsString()
  especie?: string;

  /**
   * Provincia donde buscar. Sin este filtro se devuelven las publicaciones de
   * todo el país, incluidas las que no tienen provincia cargada.
   */
  @IsOptional()
  @IsString()
  @IsIn(PROVINCIAS_ARGENTINA, { message: MENSAJE_PROVINCIA_INVALIDA })
  provincia?: string;

  @IsOptional()
  @IsEnum(TamanoMascota)
  tamano?: TamanoMascota;

  @IsOptional()
  @IsEnum(PetSex)
  sexo?: PetSex;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  esterilizado?: boolean;

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
}

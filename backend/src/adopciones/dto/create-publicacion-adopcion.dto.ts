import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

  @IsOptional()
  @IsString()
  @MaxLength(150)
  ubicacion?: string;
}

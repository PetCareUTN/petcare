import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoVivienda } from '../../common/enums/tipo-vivienda.enum';

export class CreateSolicitudAdopcionDto {
  @IsInt()
  @Min(1)
  idPublicacion: number;

  @IsOptional()
  @IsEnum(TipoVivienda)
  tipoVivienda?: TipoVivienda;

  @IsOptional()
  @IsBoolean()
  tienePatio?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneOtrasMascotas?: boolean;

  @IsOptional()
  @IsBoolean()
  tieneNinos?: boolean;

  @IsOptional()
  @IsBoolean()
  tuvoMascotasAntes?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  informacionAdicional?: string;
}

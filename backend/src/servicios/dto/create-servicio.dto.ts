import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CategoriaServicio } from '../../common/enums/categoria-servicio.enum';
import { DisponibilidadDto } from './disponibilidad.dto';

export class CreateServicioDto {
  @IsEnum(CategoriaServicio)
  categoria: CategoriaServicio;

  @IsString()
  @IsOptional()
  @MaxLength(250)
  descripcion?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadDto)
  disponibilidades: DisponibilidadDto[];
}

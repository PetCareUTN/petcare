import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { DisponibilidadVeterinariaDto } from './disponibilidad-veterinaria.dto';

export class UpdateDisponibilidadVeterinariaDto {
  @IsArray()
  @ArrayMaxSize(21)
  @ValidateNested({ each: true })
  @Type(() => DisponibilidadVeterinariaDto)
  disponibilidades: DisponibilidadVeterinariaDto[];
}

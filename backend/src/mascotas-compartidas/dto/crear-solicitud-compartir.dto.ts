import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CrearSolicitudCompartirDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idMascota: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idUsuarioDestino: number;
}

import { IsInt, IsOptional, Min } from 'class-validator';
import { CreateTurnoServicioDto } from './create-turno-servicio.dto';

/** Reserva de un servicio cargada por el propio prestador para un cliente. */
export class AgendarTurnoServicioDto extends CreateTurnoServicioDto {
  /** Dueño al que se asocia el turno; si no viene, el dueño principal de la mascota. */
  @IsOptional()
  @IsInt()
  @Min(1)
  idDuenio?: number;
}

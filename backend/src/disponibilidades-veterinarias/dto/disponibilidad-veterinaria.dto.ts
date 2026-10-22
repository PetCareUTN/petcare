import { IsEnum, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';
import { DiaSemana } from '../../common/enums/dia-semana.enum';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class DisponibilidadVeterinariaDto {
  @IsEnum(DiaSemana)
  diaSemana: DiaSemana;

  @Matches(HORA_REGEX, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio: string;

  @Matches(HORA_REGEX, { message: 'horaFin debe tener formato HH:mm' })
  horaFin: string;

  /** Cantidad de turnos que se pueden agendar en simultáneo en esta franja. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cuposPorTurno?: number;
}

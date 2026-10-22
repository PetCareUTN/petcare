import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Turno que carga la veterinaria (web) para una mascota de un cliente. */
export class AgendarTurnoVeterinarioDto {
  @IsInt()
  @Min(1)
  idMascota: number;

  /**
   * Dueño al que se asocia el turno. Si la mascota tiene varios, tiene que ser
   * uno de ellos; si no viene se usa el dueño principal.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  idDuenio?: number;

  @IsDateString()
  fecha: string;

  @IsString()
  @Matches(HORA_PATTERN, { message: 'La hora debe tener el formato HH:MM' })
  hora: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoConsulta?: string;

  /**
   * Agendar igual aunque el horario ya no tenga cupos. Sin esto, un horario
   * lleno responde 409 para que la web le pida confirmación al veterinario.
   */
  @IsOptional()
  @IsBoolean()
  forzar?: boolean;
}

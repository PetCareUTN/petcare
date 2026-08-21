import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsString, Matches, Min } from 'class-validator';

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateTurnoDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  idMascota: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  idVeterinario: number;

  @IsDateString()
  fecha: string;

  @IsString()
  @Matches(HORA_PATTERN, { message: 'La hora de inicio no tiene un formato válido' })
  horaInicio: string;

  @IsString()
  @Matches(HORA_PATTERN, { message: 'La hora de fin no tiene un formato válido' })
  horaFin: string;
}

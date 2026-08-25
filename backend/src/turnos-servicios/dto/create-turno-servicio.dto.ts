import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateTurnoServicioDto {
  @IsInt()
  @Min(1)
  idMascota: number;

  @IsInt()
  @Min(1)
  idServicio: number;

  @IsDateString()
  fecha: string;

  @IsString()
  @Matches(HORA_PATTERN, { message: 'La hora debe tener el formato HH:MM' })
  horaInicio: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  notas?: string;
}

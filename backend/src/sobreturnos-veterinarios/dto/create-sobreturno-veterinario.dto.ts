import { IsDateString, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateSobreturnoVeterinarioDto {
  @IsDateString()
  fecha: string;

  @Matches(HORA_REGEX, { message: 'hora debe tener formato HH:mm' })
  hora: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cupos?: number;
}

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarTurnoVeterinarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  motivoRechazo: string;
}

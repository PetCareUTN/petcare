import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarTurnoVeterinarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivoRechazo: string;
}

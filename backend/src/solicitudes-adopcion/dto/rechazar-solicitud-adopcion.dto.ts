import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarSolicitudAdopcionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  motivoRechazo: string;
}

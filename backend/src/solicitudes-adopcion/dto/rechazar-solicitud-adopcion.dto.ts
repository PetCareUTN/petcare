import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarSolicitudAdopcionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  motivoRechazo: string;
}

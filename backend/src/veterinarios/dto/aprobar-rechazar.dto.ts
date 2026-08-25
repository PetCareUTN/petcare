import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RechazarSolicitudDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio' })
  @MaxLength(250)
  motivoRechazo: string;
}

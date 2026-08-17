import { IsNotEmpty, IsString } from 'class-validator';

export class RechazarSolicitudDto {
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio' })
  motivoRechazo: string;
}

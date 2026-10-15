import { IsNotEmpty, IsString } from 'class-validator';

export class ConfirmarCambioEmailDto {
  @IsString()
  @IsNotEmpty()
  codigo!: string;
}

import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmarCambioEmailDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  codigo!: string;
}

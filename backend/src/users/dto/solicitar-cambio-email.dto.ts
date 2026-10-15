import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarCambioEmailDto {
  @IsEmail()
  @IsNotEmpty()
  nuevoEmail!: string;
}

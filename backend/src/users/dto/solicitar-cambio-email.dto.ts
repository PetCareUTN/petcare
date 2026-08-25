import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class SolicitarCambioEmailDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  nuevoEmail!: string;
}

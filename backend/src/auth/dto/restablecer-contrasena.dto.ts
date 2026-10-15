import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RestablecerContrasenaDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  nuevaContraseña!: string;
}
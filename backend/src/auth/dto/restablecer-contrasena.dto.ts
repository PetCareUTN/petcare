import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RestablecerContrasenaDto {
  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  codigo!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(250)
  nuevaContraseña!: string;
}

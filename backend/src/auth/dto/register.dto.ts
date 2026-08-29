import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  apellido: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{7,8}$/, {
    message: 'El DNI debe contener 7 u 8 números',
  })
  numeroDocumento: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

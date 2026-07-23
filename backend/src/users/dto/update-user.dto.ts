import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\-\s]*$/;
const TELEFONO_PATTERN = /^[0-9+\-\s()]+$/;

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(NOMBRE_PATTERN, { message: 'El nombre solo puede contener letras.' })
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(NOMBRE_PATTERN, { message: 'El apellido solo puede contener letras.' })
  apellido?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Matches(TELEFONO_PATTERN, { message: 'El teléfono solo puede contener números.' })
  telefono?: string;
}

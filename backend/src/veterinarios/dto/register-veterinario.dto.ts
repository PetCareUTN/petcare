import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  MENSAJE_PROVINCIA_INVALIDA,
  PROVINCIAS_ARGENTINA,
} from '../../common/constants/provincias';

const TELEFONO_PATTERN = /^[0-9+\-\s()]+$/;

export class RegisterVeterinarioDto {
  /** Nombre de la veterinaria o del profesional. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Matches(TELEFONO_PATTERN, {
    message: 'El teléfono solo puede contener números.',
  })
  telefono: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion: string;

  /** Provincia donde atiende la veterinaria; va aparte de la dirección. */
  @IsString()
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  @IsIn(PROVINCIAS_ARGENTINA, { message: MENSAJE_PROVINCIA_INVALIDA })
  provincia: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de documento es obligatorio' })
  @MaxLength(30)
  numeroDocumento: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de matrícula es obligatorio' })
  @MaxLength(50)
  numeroMatricula: string;

  @IsString()
  @IsNotEmpty({ message: 'La provincia de matrícula es obligatoria' })
  @MaxLength(100)
  provinciaMatricula: string;
}

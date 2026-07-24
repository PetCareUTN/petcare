import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSolicitudDto {
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

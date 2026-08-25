import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarContraseñaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(250)
  viejaContraseña!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(250)
  nuevaContraseña!: string;
}

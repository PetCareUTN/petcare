import {IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CambiarContraseñaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  viejaContraseña!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  nuevaContraseña!: string;
}
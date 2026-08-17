import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePublicacionAdopcionDto {
  @Type(() => Number)
  @IsInt()
  idMascota: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion: string;
}

import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CambiarRolDto {
  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  idRol: number;
}

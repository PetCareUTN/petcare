import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import {
  MENSAJE_PROVINCIA_INVALIDA,
  PROVINCIAS_ARGENTINA,
} from '../../common/constants/provincias';

export class UpdateProvinciaDto {
  @IsString()
  @IsNotEmpty({ message: 'La provincia es obligatoria' })
  @IsIn(PROVINCIAS_ARGENTINA, { message: MENSAJE_PROVINCIA_INVALIDA })
  provincia: string;
}

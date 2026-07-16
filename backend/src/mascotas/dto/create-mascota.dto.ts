import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PetSex } from '../../common/enums/pet-sex.enum';

export class CreateMascotaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  especie: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  raza?: string;

  @IsEnum(PetSex)
  sexo: PetSex;

  @IsDateString()
  @IsOptional()
  fechaNacimiento?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  peso?: number;

  @IsBoolean()
  @IsOptional()
  esterilizado?: boolean;

  @IsString()
  @IsOptional()
  foto?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

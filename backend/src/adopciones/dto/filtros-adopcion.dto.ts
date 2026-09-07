import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PetSex } from '../../common/enums/pet-sex.enum';
import { TamanoMascota } from '../../common/enums/tamano-mascota.enum';

export class FiltrosAdopcionDto {
  @IsOptional()
  @IsString()
  especie?: string;

  @IsOptional()
  @IsEnum(TamanoMascota)
  tamano?: TamanoMascota;

  @IsOptional()
  @IsEnum(PetSex)
  sexo?: PetSex;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  esterilizado?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  vacunado?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  compatiblePerros?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  compatibleGatos?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  compatibleNinos?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  necesitaPatio?: boolean;
}

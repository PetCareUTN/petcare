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
import { Transform } from 'class-transformer';
import { PetSex } from '../../common/enums/pet-sex.enum';
import { MaxRichTextLength } from '../../common/validators/max-rich-text-length.validator';

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

  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsNumber()
  @Min(0)
  @IsOptional()
  peso?: number;

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  esterilizado?: boolean;

  @IsString()
  @IsOptional()
  @MaxRichTextLength(250)
  observaciones?: string;

  @IsString()
  @IsOptional()
  @MaxRichTextLength(250)
  alergias?: string;
}

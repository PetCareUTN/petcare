import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ClinicalEventType } from '../../common/enums/clinical-event-type.enum';

export class CreateEventoClinicoDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  idMascota: number;

  @IsEnum(ClinicalEventType)
  tipo: ClinicalEventType;

  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsOptional()
  diagnostico?: string;

  @IsString()
  @IsOptional()
  tratamiento?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

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
import { MaxRichTextLength } from '../../common/validators/max-rich-text-length.validator';

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
  @MaxRichTextLength(250)
  descripcion: string;

  @IsString()
  @IsOptional()
  @MaxRichTextLength(250)
  diagnostico?: string;

  @IsString()
  @IsOptional()
  @MaxRichTextLength(250)
  tratamiento?: string;

  @IsString()
  @IsOptional()
  @MaxRichTextLength(250)
  observaciones?: string;
}

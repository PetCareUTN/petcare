import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReportePerdidaDto {
  @IsInt()
  idMascota: number;

  /** Si no viene, se toma el momento del reporte. */
  @IsDateString()
  @IsOptional()
  fechaPerdida?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitud: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitud: number;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  descripcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  contacto?: string;
}

import { Transform, Type } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';

const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

export class SolicitarPrestadorDto {
  @IsEnum(CategoriaServicio) categoria: CategoriaServicio;
  @Trim() @IsString() @MinLength(3) @MaxLength(200) nombreCompleto: string;
  @Trim()
  @IsString()
  @Matches(/^[A-Za-z0-9.-]{5,20}$/)
  numeroDocumento: string;
  @Trim() @IsString() @Matches(/^[+0-9()\s-]{6,30}$/) telefono: string;
  @Trim() @IsString() @MinLength(30) @MaxLength(2000) experiencia: string;
  @IsOptional() @Trim() @IsString() @MaxLength(1500) referencias?: string;
  @Trim() @IsString() @MinLength(50) @MaxLength(2000) protocolo: string;
  // Para guardería/peluquería es la dirección del local; para paseador es un
  // domicilio o zona de referencia (no implica que el servicio se preste ahí).
  @Trim()
  @IsString()
  @IsNotEmpty({ message: 'Indicá una dirección o zona de referencia.' })
  @MaxLength(255)
  direccion: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacidad?: number;
  @Equals('true') consentimiento: string;
}

export class RevisarPrestadorDto {
  @IsIn(['aprobado', 'correccion', 'rechazado', 'suspendido']) estado:
    'aprobado' | 'correccion' | 'rechazado' | 'suspendido';
  @Trim() @IsString() @MinLength(15) @MaxLength(2000) motivo: string;
  @IsBoolean() identidadRevisada: boolean;
  @IsBoolean() contactoVerificado: boolean;
  @IsBoolean() referenciasComprobadas: boolean;
  @IsBoolean() condicionesRevisadas: boolean;
  @IsString() @MaxLength(50) version: string;
}

export class CrearResenaDto {
  @IsInt() @Min(1) @Max(5) puntuacion: number;
  @Trim() @IsString() @MinLength(10) @MaxLength(1000) comentario: string;
}
export class CrearReporteDto {
  @Trim() @IsString() @MinLength(15) @MaxLength(2000) motivo: string;
}
export class ResolverReporteDto {
  @Trim() @IsString() @MinLength(15) @MaxLength(2000) resolucion: string;
  @IsBoolean() suspender: boolean;
}

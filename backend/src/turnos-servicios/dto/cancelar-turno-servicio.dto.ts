import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelarTurnoServicioDto {
  @IsOptional()
  @IsString()
  @MaxLength(250)
  motivoCancelacion?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelarTurnoVeterinarioDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoCancelacion?: string;
}

import { IsBoolean } from 'class-validator';

export class RegistrarAsistenciaDto {
  /** `true` si el cliente se presentó, `false` si no vino. */
  @IsBoolean()
  asistio: boolean;
}

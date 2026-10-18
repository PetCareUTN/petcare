export class DuenoMascotaResponseDto {
  idUsuario: number;
  nombre: string;
  /** Quién registró la mascota (o lo heredó): puede compartirla. */
  esPrincipal: boolean;
  /** Cuándo se sumó como dueño. */
  desde: Date;
}

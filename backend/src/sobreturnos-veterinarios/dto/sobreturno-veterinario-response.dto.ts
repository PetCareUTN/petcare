import { SobreturnoVeterinario } from '../entities/sobreturno-veterinario.entity';

export class SobreturnoVeterinarioResponseDto {
  idSobreturno: number;
  idVeterinario: number;
  fecha: string;
  hora: string;
  cupos: number;

  static fromEntity(
    sobreturno: SobreturnoVeterinario,
  ): SobreturnoVeterinarioResponseDto {
    return {
      idSobreturno: sobreturno.idSobreturno,
      idVeterinario: sobreturno.veterinario.idVeterinario,
      fecha: sobreturno.fecha,
      hora: sobreturno.hora,
      cupos: sobreturno.cupos,
    };
  }
}

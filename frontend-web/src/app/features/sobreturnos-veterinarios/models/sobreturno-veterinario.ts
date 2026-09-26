export interface CreateSobreturnoVeterinarioRequest {
  fecha: string;
  hora: string;
  cupos: number;
}

export interface SobreturnoVeterinarioResponse {
  idSobreturno: number;
  idVeterinario: number;
  fecha: string;
  hora: string;
  cupos: number;
}

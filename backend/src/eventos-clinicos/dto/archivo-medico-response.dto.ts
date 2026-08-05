import { ArchivoMedico } from '../entities/archivo-medico.entity';

export class ArchivoMedicoResponseDto {
  idArchivo: number;
  idEvento: number;
  nombreOriginal: string;
  url: string;
  mimeType: string;
  tamanoBytes: number;
  createdAt: Date;

  static fromEntity(
    archivo: ArchivoMedico,
    idEvento: number,
  ): ArchivoMedicoResponseDto {
    return {
      idArchivo: archivo.idArchivo,
      idEvento,
      nombreOriginal: archivo.nombreOriginal,
      url: `/uploads/eventos-clinicos/${archivo.nombreArchivo}`,
      mimeType: archivo.mimeType,
      tamanoBytes: archivo.tamanoBytes,
      createdAt: archivo.createdAt,
    };
  }
}

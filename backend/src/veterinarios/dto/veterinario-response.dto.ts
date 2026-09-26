import { ValidationStatus } from '../../common/enums/validation-status.enum';

export type TipoDocumentoVeterinario = 'matricula' | 'habilitacion';

/**
 * URL del endpoint autenticado que devuelve el documento, no del archivo
 * estático: ver VeterinariosService.obtenerDocumento.
 */
export function urlDocumentoVeterinario(
  idVeterinario: number,
  tipo: TipoDocumentoVeterinario,
): string {
  const baseUrl = process.env.API_URL ?? 'http://localhost:3000';
  return `${baseUrl}/veterinarios/${idVeterinario}/documentos/${tipo}`;
}

export class VeterinarioResponseDto {
  idVeterinario: number;
  idUsuario: number;
  numeroDocumento: string;
  numeroMatricula: string;
  provinciaMatricula: string;
  matriculaUrl: string;
  habilitacionUrl: string | null;
  estadoValidacion: ValidationStatus;
  motivoRechazo: string | null;
  createdAt: Date;

  static fromEntity(vet: any): VeterinarioResponseDto {
    const dto = new VeterinarioResponseDto();

    dto.idVeterinario = vet.idVeterinario;
    dto.idUsuario = vet.usuario?.idUsuario ?? vet.idUsuario;
    dto.numeroDocumento = vet.numeroDocumento;
    dto.numeroMatricula = vet.numeroMatricula;
    dto.provinciaMatricula = vet.provinciaMatricula;
    dto.matriculaUrl = urlDocumentoVeterinario(vet.idVeterinario, 'matricula');
    dto.habilitacionUrl = vet.habilitacionUrl
      ? urlDocumentoVeterinario(vet.idVeterinario, 'habilitacion')
      : null;
    dto.estadoValidacion = vet.estadoValidacion;
    dto.motivoRechazo = vet.motivoRechazo;
    dto.createdAt = vet.createdAt;
    return dto;
  }
}

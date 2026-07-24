import { ValidationStatus } from '../../common/enums/validation-status.enum';

export class VeterinarioResponseDto {
  idVeterinario: number;
  idUsuario: number;
  numeroDocumento: string;
  numeroMatricula: string;
  provinciaMatricula: string;
  matriculaUrl: string;
  estadoValidacion: ValidationStatus;
  motivoRechazo: string | null;
  createdAt: Date;

  static fromEntity(vet: any): VeterinarioResponseDto {
    const dto = new VeterinarioResponseDto();
    const baseUrl = process.env.API_URL ?? 'http://localhost:3000';

    dto.idVeterinario = vet.idVeterinario;
    dto.idUsuario = vet.usuario?.idUsuario ?? vet.idUsuario;
    dto.numeroDocumento = vet.numeroDocumento;
    dto.numeroMatricula = vet.numeroMatricula;
    dto.provinciaMatricula = vet.provinciaMatricula;
    dto.matriculaUrl = `${baseUrl}/${vet.matriculaUrl}`;
    dto.estadoValidacion = vet.estadoValidacion;
    dto.motivoRechazo = vet.motivoRechazo;
    dto.createdAt = vet.createdAt;
    return dto;
  }
}

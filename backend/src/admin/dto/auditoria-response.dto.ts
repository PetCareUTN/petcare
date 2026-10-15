import { AuditoriaUsuario } from '../entities/auditoria-usuario.entity';

export class AuditoriaResponseDto {
  id_auditoria: number;
  id_usuario: number;
  tipo_accion: string;
  detalle: Record<string, unknown> | null;
  fecha_accion: Date;

  static fromEntity(auditoria: AuditoriaUsuario): AuditoriaResponseDto {
    const dto = new AuditoriaResponseDto();
    dto.id_auditoria = auditoria.idAuditoria;
    dto.id_usuario = auditoria.idUsuario;
    dto.tipo_accion = auditoria.tipoAccion;
    dto.detalle = auditoria.detalle;
    dto.fecha_accion = auditoria.fechaAccion;
    return dto;
  }
}

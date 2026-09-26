import { SuscripcionEstado } from '../../common/enums/suscripcion-estado.enum';
import { Suscripcion } from '../entities/suscripcion.entity';

export class SuscripcionResponseDto {
  idSuscripcion: number;
  idUsuario: number;
  estado: SuscripcionEstado;
  monto: number;
  moneda: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  fechaVencimiento: Date | null;
  /** Inicio del período de gracia (null si no está en gracia). */
  fechaGraciaInicio: Date | null;
  /** Si el veterinario puede usar la plataforma con esta suscripción. */
  accesoPermitido: boolean;
  /** Motivo del bloqueo legible (null si accesoPermitido es true). */
  motivoBloqueo: string | null;
  /** Código interno del bloqueo para que el frontend decida el destino. */
  codigoBloqueo: string | null;

  static fromEntity(
    suscripcion: Suscripcion,
    acceso?: {
      accesoPermitido: boolean;
      motivo: string | null;
      codigo: string | null;
    },
  ): SuscripcionResponseDto {
    const dto = new SuscripcionResponseDto();
    dto.idSuscripcion = suscripcion.idSuscripcion;
    dto.idUsuario = suscripcion.usuario?.idUsuario;
    dto.estado = suscripcion.estado;
    dto.monto = Number(suscripcion.monto);
    dto.moneda = suscripcion.moneda;
    dto.fechaInicio = suscripcion.fechaInicio;
    dto.fechaFin = suscripcion.fechaFin;
    dto.fechaVencimiento = suscripcion.fechaVencimiento;
    dto.fechaGraciaInicio = suscripcion.fechaGraciaInicio ?? null;
    dto.accesoPermitido = acceso?.accesoPermitido ?? true;
    dto.motivoBloqueo = acceso?.motivo ?? null;
    dto.codigoBloqueo = acceso?.codigo ?? null;
    return dto;
  }
}

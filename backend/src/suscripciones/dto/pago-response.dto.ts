import { PagoSuscripcion } from '../entities/pago-suscripcion.entity';

export class PagoResponseDto {
  idPago: number;
  idSuscripcion: number;
  monto: number;
  moneda: string;
  estado: string;
  mpPaymentId: string | null;
  mpStatus: string | null;
  fechaPago: Date | null;
  createdAt: Date;

  static fromEntity(pago: PagoSuscripcion): PagoResponseDto {
    const dto = new PagoResponseDto();
    dto.idPago = pago.idPago;
    dto.idSuscripcion = pago.suscripcion?.idSuscripcion;
    dto.monto = Number(pago.monto);
    dto.moneda = pago.moneda;
    dto.estado = pago.estado;
    dto.mpPaymentId = pago.mpPaymentId;
    dto.mpStatus = pago.mpStatus;
    dto.fechaPago = pago.fechaPago;
    dto.createdAt = pago.createdAt;
    return dto;
  }
}

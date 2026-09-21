import { NotificationType } from '../../common/enums/notification-type.enum';
import { Notificacion } from '../entities/notificacion.entity';

export class NotificacionResponseDto {
  idNotificacion: number;
  tipo: NotificationType;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  fechaEnvio: Date;
  /** Ver `Notificacion.idReferencia`. */
  idReferencia: number | null;

  static fromEntity(notif: Notificacion): NotificacionResponseDto {
    const dto = new NotificacionResponseDto();
    dto.idNotificacion = notif.idNotificacion;
    dto.tipo = notif.tipo;
    dto.titulo = notif.titulo;
    dto.cuerpo = notif.cuerpo;
    dto.leida = notif.leida;
    dto.fechaEnvio = notif.fechaEnvio;
    dto.idReferencia = notif.idReferencia ?? null;
    return dto;
  }
}

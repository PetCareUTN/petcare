import { NotificationType } from '../../common/enums/notification-type.enum';

export class NotificacionResponseDto {
  idNotificacion: number;
  tipo: NotificationType;
  titulo: string;
  cuerpo: string;
  leida: boolean;
  fechaEnvio: Date;

  static fromEntity(notif: any): NotificacionResponseDto {
    const dto = new NotificacionResponseDto();
    dto.idNotificacion = notif.idNotificacion;
    dto.tipo = notif.tipo;
    dto.titulo = notif.titulo;
    dto.cuerpo = notif.cuerpo;
    dto.leida = notif.leida;
    dto.fechaEnvio = notif.fechaEnvio;
    return dto;
  }
}

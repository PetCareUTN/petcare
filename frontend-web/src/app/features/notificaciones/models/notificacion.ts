export interface Notificacion {
  idNotificacion: number;
  tipo:
    | 'solicitud_recibida'
    | 'aprobacion'
    | 'rechazo'
    | 'turno_confirmado'
    | 'turno_cancelado';
  titulo: string;
  cuerpo: string;
  leida: boolean;
  fechaEnvio: string;
}

export interface Notificacion {
  idNotificacion: number;
  tipo: 'solicitud_recibida' | 'aprobacion' | 'rechazo';
  titulo: string;
  cuerpo: string;
  leida: boolean;
  fechaEnvio: string;
}

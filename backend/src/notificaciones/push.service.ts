import { Injectable, Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';

/** Aviso a enviar a un dispositivo. */
export interface MensajePush {
  token: string;
  titulo: string;
  cuerpo: string;
  /**
   * Viaja como `data` del mensaje: la app lo usa para abrir la pantalla que
   * corresponde al tocar el aviso. Todos los valores van como texto porque FCM
   * no acepta otra cosa en `data`.
   */
  datos: Record<string, string>;
}

/** Por qué no se pudo entregar, cuando el motivo cambia qué hacer después. */
export type ResultadoPush =
  { entregado: true } | { entregado: false; tokenInvalido: boolean };

const SCOPE_FCM = 'https://www.googleapis.com/auth/firebase.messaging';

/**
 * Envío de notificaciones push por Firebase Cloud Messaging (HTTP v1).
 *
 * Usa `google-auth-library`, que ya estaba en el proyecto para validar el
 * ingreso con Google, en vez de sumar `firebase-admin`: lo único que hace falta
 * es firmar un token con la cuenta de servicio y hacer un POST.
 *
 * **Sin credenciales queda apagado**: si faltan las variables de entorno, el
 * servicio no envía nada y lo dice una sola vez en el log. Es deliberado, no un
 * modo degradado accidental: el push es un canal extra, y la notificación
 * interna —que es la que garantiza el historial— ya se guardó igual. Así el
 * backend arranca y funciona en local y en CI sin cuenta de Firebase.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private auth: GoogleAuth | null = null;
  private projectId: string | null = null;
  private avisoDeApagadoEmitido = false;

  constructor() {
    this.configurar();
  }

  get habilitado(): boolean {
    return this.auth !== null && this.projectId !== null;
  }

  /**
   * Devuelve si FCM aceptó el mensaje. `tokenInvalido` marca los tokens que ya
   * no sirven (app desinstalada, token rotado) para que quien llama los borre:
   * si no, la tabla se llena de tokens muertos que se reintentan para siempre.
   */
  async enviar(mensaje: MensajePush): Promise<ResultadoPush> {
    if (!this.auth || !this.projectId) {
      this.avisarApagadoUnaVez();
      return { entregado: false, tokenInvalido: false };
    }

    try {
      const client = await this.auth.getClient();
      await client.request({
        url: `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`,
        method: 'POST',
        data: {
          message: {
            token: mensaje.token,
            // Mensaje **solo de datos**, sin bloque `notification`: si lo
            // llevara, con la app en segundo plano FCM dibujaría la
            // notificación por su cuenta y el toque abriría la actividad
            // de arranque en vez de la pantalla del aviso. Sin él, siempre
            // llega a ServicioMensajeriaPetCare, que la arma y le pone el
            // destino correcto.
            data: {
              ...mensaje.datos,
              titulo: mensaje.titulo,
              cuerpo: mensaje.cuerpo,
            },
            android: { priority: 'high' },
          },
        },
      });

      return { entregado: true };
    } catch (error) {
      const tokenInvalido = this.esTokenInvalido(error);
      if (!tokenInvalido) {
        this.logger.error(
          'FCM rechazó el envío',
          error instanceof Error ? error.message : String(error),
        );
      }
      return { entregado: false, tokenInvalido };
    }
  }

  /**
   * La cuenta de servicio llega como JSON en una variable de entorno y no como
   * archivo: es un secreto y así no queda nada en el repo ni en la imagen.
   */
  private configurar(): void {
    const credencial = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (!credencial) return;

    try {
      const credentials = JSON.parse(credencial) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      const projectId =
        process.env.FIREBASE_PROJECT_ID?.trim() || credentials.project_id;
      if (!projectId || !credentials.client_email || !credentials.private_key) {
        this.logger.warn(
          'FIREBASE_SERVICE_ACCOUNT no tiene project_id, client_email o private_key: el push queda desactivado',
        );
        return;
      }

      this.auth = new GoogleAuth({ credentials, scopes: [SCOPE_FCM] });
      this.projectId = projectId;
      this.logger.log(`Push habilitado para el proyecto ${projectId}`);
    } catch {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT no es un JSON válido: el push queda desactivado',
      );
    }
  }

  /**
   * FCM responde 404 UNREGISTERED cuando el token ya no existe y 400 cuando
   * está mal formado. En los dos casos el token no sirve más; un 401, un 429 o
   * un 500 son problemas nuestros o pasajeros y el token se conserva.
   */
  private esTokenInvalido(error: unknown): boolean {
    const status =
      (error as { status?: number; code?: number })?.status ??
      (error as { response?: { status?: number } })?.response?.status;
    return status === 404 || status === 400;
  }

  private avisarApagadoUnaVez(): void {
    if (this.avisoDeApagadoEmitido) return;
    this.avisoDeApagadoEmitido = true;
    this.logger.warn(
      'Push desactivado: falta FIREBASE_SERVICE_ACCOUNT. Las notificaciones internas siguen funcionando.',
    );
  }
}

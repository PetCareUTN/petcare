import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface GoogleAccount {
  /** "sub" del token: id estable de la cuenta de Google. */
  googleId: string;
  email: string;
  nombre: string;
  apellido: string | null;
}

/**
 * Valida contra Google el ID token que manda la app.
 *
 * La verificación comprueba la firma de Google, que el token no esté vencido y
 * que haya sido emitido para nuestro client id. Sin esto, cualquiera podría
 * mandar un JSON armado a mano y hacerse pasar por otra persona.
 */
@Injectable()
export class GoogleTokenVerifierService {
  private readonly client = new OAuth2Client();

  async verificar(idToken: string): Promise<GoogleAccount> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error(
        'Falta GOOGLE_CLIENT_ID en el .env. Ver .env.example para configurarlo.',
      );
    }

    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        // Acepta solo tokens emitidos para esta app.
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'El token de Google no es válido',
      });
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'El token de Google no es válido',
      });
    }

    /*
     * Sin email verificado no podemos vincular la cuenta a un email existente
     * sin riesgo de que alguien reclame un email que no es suyo.
     */
    if (payload.email_verified === false) {
      throw new UnauthorizedException({
        codigoEstado: 401,
        mensaje: 'La cuenta de Google no tiene el email verificado',
      });
    }

    return {
      googleId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      nombre: payload.given_name ?? payload.name ?? payload.email,
      apellido: payload.family_name ?? null,
    };
  }
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Límite de intentos por IP para los endpoints de autenticación, que son los
 * que se pueden atacar sin sesión: probar contraseñas en el login, o disparar
 * mails de recuperación sin freno.
 *
 * Es el ThrottlerGuard de Nest, pero con el error en el mismo formato que el
 * resto de la API ({ codigoEstado, mensaje }), para que la web y la app lo
 * muestren como cualquier otro.
 *
 * Los límites están en AppModule (ThrottlerModule) y se ajustan por endpoint
 * con @Throttle.
 */
@Injectable()
export class LimiteIntentosGuard extends ThrottlerGuard {
  protected throwThrottlingException(): Promise<void> {
    throw new HttpException(
      {
        codigoEstado: HttpStatus.TOO_MANY_REQUESTS,
        mensaje: 'Demasiados intentos. Esperá un minuto y volvé a probar',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

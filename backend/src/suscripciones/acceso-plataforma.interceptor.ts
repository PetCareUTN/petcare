import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { RoleName } from '../common/enums/role-name.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SuscripcionesService } from './suscripciones.service';

/**
 * Rutas que un veterinario puede usar sin suscripción activa.
 *
 * Importante que estén todas las que necesita la pantalla de "Mi
 * suscripción" (consultar estado, iniciar y verificar el pago) y el flujo de
 * notificaciones, para que no haya loop de bloqueo.
 */
const RUTAS_LIBRES_VETERINARIO = [
  '/suscripciones',
  '/veterinarios/mi-estado',
  '/notificaciones',
  '/auth/me',
  '/auth/cambiar-contrasena',
];

/**
 * Control centralizado de acceso por suscripción.
 *
 * Corre como interceptor global (APP_INTERCEPTOR), después de los guards:
 * JWT/roles siguen siendo responsabilidad de JwtAuthGuard y RolesGuard.
 * Aplica solo a requests autenticados con rol VETERINARIO; cualquier otro
 * usuario (admin, cliente, anónimo, webhook de MP) pasa sin chequeo.
 *
 * Si el veterinario no tiene acceso, responde HTTP 402 con el código de
 * bloqueo para que el frontend lo lleve a "Mi suscripción".
 */
@Injectable()
export class AccesoPlataformaInterceptor implements NestInterceptor {
  constructor(private readonly suscripcionesService: SuscripcionesService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    if (!user || user.rol !== RoleName.VETERINARIO) {
      return next.handle();
    }

    const ruta = request.path ?? request.url.split('?')[0] ?? '';
    if (RUTAS_LIBRES_VETERINARIO.some((libre) => this.coincide(ruta, libre))) {
      return next.handle();
    }

    const acceso = await this.suscripcionesService.evaluarAcceso(user.sub);
    if (!acceso.accesoPermitido) {
      throw new HttpException(
        {
          codigoEstado: HttpStatus.PAYMENT_REQUIRED,
          codigo: acceso.codigo,
          mensaje: acceso.motivo,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return next.handle();
  }

  /** Match por prefijo respetando bordes de ruta: '/auth/me' no matchea '/auth/me2'. */
  private coincide(ruta: string, prefijo: string): boolean {
    return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
  }
}

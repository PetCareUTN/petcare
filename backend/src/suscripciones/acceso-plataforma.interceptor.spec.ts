import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { of } from 'rxjs';
import { RoleName } from '../common/enums/role-name.enum';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AccesoPlataformaInterceptor } from './acceso-plataforma.interceptor';
import { SuscripcionesService } from './suscripciones.service';

describe('AccesoPlataformaInterceptor', () => {
  let interceptor: AccesoPlataformaInterceptor;
  let suscripcionesService: { evaluarAcceso: jest.Mock };
  let next: { handle: jest.Mock };

  const vet: JwtPayload = {
    sub: 7,
    email: 'vet@petcare.test',
    idRol: 2,
    rol: RoleName.VETERINARIO,
  };
  const admin: JwtPayload = {
    sub: 1,
    email: 'admin@petcare.test',
    idRol: 3,
    rol: RoleName.ADMINISTRADOR,
  };

  const context = (path: string, user?: JwtPayload): ExecutionContext =>
    ({
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => ({ path, url: path, user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    suscripcionesService = { evaluarAcceso: jest.fn() };
    interceptor = new AccesoPlataformaInterceptor(
      suscripcionesService as unknown as SuscripcionesService,
    );
    next = { handle: jest.fn(() => of({ ok: true })) };
  });

  it('deja pasar requests sin usuario (login, webhook de MP)', async () => {
    await interceptor.intercept(context('/auth/login'), next);

    expect(suscripcionesService.evaluarAcceso).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalled();
  });

  it('no chequea la suscripción de usuarios que no son veterinarios', async () => {
    await interceptor.intercept(context('/admin/usuarios', admin), next);

    expect(suscripcionesService.evaluarAcceso).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalled();
  });

  it('deja pasar al veterinario por las rutas libres sin consultar el acceso', async () => {
    const rutasLibres = [
      '/suscripciones/mia',
      '/suscripciones/suscribirme',
      '/suscripciones/historial',
      '/suscripciones/webhook',
      '/veterinarios/mi-estado',
      '/notificaciones',
      '/notificaciones/1/leer',
      '/auth/me',
      '/auth/cambiar-contrasena',
    ];

    for (const ruta of rutasLibres) {
      await interceptor.intercept(context(ruta, vet), next);
    }

    expect(suscripcionesService.evaluarAcceso).not.toHaveBeenCalled();
    expect(next.handle).toHaveBeenCalledTimes(rutasLibres.length);
  });

  it('el match de rutas libres respeta los bordes de la ruta', async () => {
    suscripcionesService.evaluarAcceso.mockResolvedValue({
      accesoPermitido: true,
      codigo: null,
      motivo: null,
    });

    await interceptor.intercept(context('/suscripciones-otra', vet), next);

    expect(suscripcionesService.evaluarAcceso).toHaveBeenCalledWith(vet.sub);
  });

  it('responde 402 si el veterinario no tiene acceso por suscripción', async () => {
    suscripcionesService.evaluarAcceso.mockResolvedValue({
      accesoPermitido: false,
      codigo: 'SUSCRIPCION_PENDIENTE',
      motivo: 'Completá el pago para usar la plataforma.',
    });

    await expect(
      interceptor.intercept(context('/turnos-veterinarios/mia', vet), next),
    ).rejects.toMatchObject({
      status: HttpStatus.PAYMENT_REQUIRED,
      response: {
        codigoEstado: 402,
        codigo: 'SUSCRIPCION_PENDIENTE',
        mensaje: 'Completá el pago para usar la plataforma.',
      },
    });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('deja pasar si el veterinario tiene acceso', async () => {
    suscripcionesService.evaluarAcceso.mockResolvedValue({
      accesoPermitido: true,
      codigo: null,
      motivo: null,
    });

    await interceptor.intercept(context('/eventos-clinicos', vet), next);

    expect(suscripcionesService.evaluarAcceso).toHaveBeenCalledWith(vet.sub);
    expect(next.handle).toHaveBeenCalled();
  });
});

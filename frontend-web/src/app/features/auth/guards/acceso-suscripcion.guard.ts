import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SuscripcionesService } from '../../suscripciones/services/suscripciones-service';

/**
 * Exige suscripción vigente para las secciones operativas del veterinario.
 *
 * Consulta el estado real del backend (única fuente de verdad) y, si el
 * veterinario no tiene acceso, lo manda a "Mi suscripción", que el backend
 * nunca bloquea. Ante cualquier error también va a "Mi suscripción": ahí se
 * puede reintentar sin quedar en loop.
 */
export const accesoSuscripcionGuard: CanActivateFn = () => {
  const suscripcionesService = inject(SuscripcionesService);
  const router = inject(Router);

  return suscripcionesService.miSuscripcion().pipe(
    map((suscripcion) =>
      suscripcion.accesoPermitido ? true : router.createUrlTree(['/suscripciones']),
    ),
    catchError(() => of(router.createUrlTree(['/suscripciones']))),
  );
};

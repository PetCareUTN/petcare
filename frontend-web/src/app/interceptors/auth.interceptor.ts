import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../features/auth/services/auth-service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearToken();
        router.navigateByUrl('/login');
      }
      // 402: el veterinario no tiene suscripción vigente. La pantalla de
      // "Mi suscripción" es la única que lo puede resolver, y el backend la
      // deja pasar siempre (sin loop).
      if (error.status === 402 && !router.url.startsWith('/suscripciones')) {
        router.navigateByUrl('/suscripciones');
      }
      return throwError(() => error);
    }),
  );
};

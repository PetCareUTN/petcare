import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { AuthService } from '../services/auth-service';

/**
 * Deja entrar solo a quien no inició sesión.
 *
 * Es `canMatch` y no `canActivate` a propósito: si devuelve false, el router
 * sigue probando las rutas siguientes con el mismo path. Así la landing y el
 * inicio autenticado pueden compartir "/" sin redirecciones de por medio.
 */
export const invitadoGuard: CanMatchFn = () => !inject(AuthService).isAuthenticated();

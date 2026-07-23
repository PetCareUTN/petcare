import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import { Notificacion } from '../models/notificacion';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/notificaciones`;

  listar(): Observable<Notificacion[]> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<Notificacion[]>(this.baseUrl, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  marcarLeida(id: number): Observable<{ mensaje: string }> {
    const headers = this.getAuthHeaders();
    return this.http
      .patch<{ mensaje: string }>(`${this.baseUrl}/${id}/leer`, {}, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private mapError(error: HttpErrorResponse): Observable<never> {
    const body = error.error as Partial<ApiError> | null;
    const apiError: ApiError =
      body && typeof body === 'object' && typeof body.mensaje === 'string'
        ? { codigoEstado: body.codigoEstado ?? error.status, mensaje: body.mensaje }
        : {
            codigoEstado: error.status || 0,
            mensaje: 'No se pudo conectar con el servidor. Intentá de nuevo.',
          };
    return throwError(() => apiError);
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  SolicitudPendiente,
  SolicitudDetalle,
  VeterinarioResponse,
} from '../models/veterinario';

@Injectable({ providedIn: 'root' })
export class VeterinariosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/veterinarios`;

  solicitar(formData: FormData): Observable<VeterinarioResponse> {
    const headers = this.getAuthHeaders();
    return this.http
      .post<VeterinarioResponse>(`${this.baseUrl}/solicitar`, formData, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  miEstado(): Observable<VeterinarioResponse> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<VeterinarioResponse>(`${this.baseUrl}/mi-estado`, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  pendientes(): Observable<SolicitudPendiente[]> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<SolicitudPendiente[]>(`${this.baseUrl}/pendientes`, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  detalle(id: number): Observable<SolicitudDetalle> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<SolicitudDetalle>(`${this.baseUrl}/${id}/detalle`, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  aprobar(id: number): Observable<{ mensaje: string }> {
    const headers = this.getAuthHeaders();
    return this.http
      .patch<{ mensaje: string }>(`${this.baseUrl}/${id}/aprobar`, {}, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  rechazar(id: number, motivoRechazo: string): Observable<{ mensaje: string }> {
    const headers = this.getAuthHeaders();
    return this.http
      .patch<{ mensaje: string }>(
        `${this.baseUrl}/${id}/rechazar`,
        { motivoRechazo },
        { headers },
      )
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

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  CategoriaServicio,
  CreateServicioRequest,
  ServicioResponse,
  UpdateServicioRequest,
} from '../models/servicio';

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/servicios`;

  create(data: CreateServicioRequest): Observable<ServicioResponse> {
    return this.http
      .post<ServicioResponse>(this.baseUrl, data, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  getMine(): Observable<ServicioResponse[]> {
    return this.http
      .get<ServicioResponse[]>(`${this.baseUrl}/mios`, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  getAll(categoria?: CategoriaServicio): Observable<ServicioResponse[]> {
    return this.http
      .get<ServicioResponse[]>(this.baseUrl, {
        headers: this.authHeaders(),
        params: categoria ? { categoria } : {},
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  getOne(id: number): Observable<ServicioResponse> {
    return this.http
      .get<ServicioResponse>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  update(id: number, data: UpdateServicioRequest): Observable<ServicioResponse> {
    return this.http
      .patch<ServicioResponse>(`${this.baseUrl}/${id}`, data, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  private authHeaders(): HttpHeaders | undefined {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }

  private mapError(error: HttpErrorResponse): Observable<never> {
    const body = error.error as { mensaje?: string; message?: string | string[] } | null;
    const mensaje =
      (body && typeof body === 'object' && typeof body.mensaje === 'string' && body.mensaje) ||
      (body && typeof body === 'object' && typeof body.message === 'string' && body.message) ||
      (body && typeof body === 'object' && Array.isArray(body.message) && body.message.join(', ')) ||
      undefined;

    const apiError: ApiError = mensaje
      ? { codigoEstado: error.status, mensaje }
      : {
          codigoEstado: error.status || 0,
          mensaje: 'No se pudo conectar con el servidor. Intenta de nuevo.',
        };
    return throwError(() => apiError);
  }
}

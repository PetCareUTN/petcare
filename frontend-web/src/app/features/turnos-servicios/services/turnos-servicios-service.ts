import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  AgendarTurnoServicioRequest,
  CancelarTurnoServicioRequest,
  TurnoServicioEstado,
  TurnoServicioResponse,
} from '../models/turno-servicio';

@Injectable({ providedIn: 'root' })
export class TurnosServiciosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/turnos-servicios`;

  getRecibidas(estado?: TurnoServicioEstado): Observable<TurnoServicioResponse[]> {
    return this.http
      .get<TurnoServicioResponse[]>(`${this.baseUrl}/mias`, {
        headers: this.authHeaders(),
        params: estado ? { estado } : {},
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /** El prestador agenda un turno de uno de sus servicios para un cliente. */
  agendar(data: AgendarTurnoServicioRequest): Observable<TurnoServicioResponse> {
    return this.http
      .post<TurnoServicioResponse>(`${this.baseUrl}/mia`, data, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /** Horarios de inicio (HH:MM) todavía libres de un servicio en una fecha. */
  getHorariosDisponibles(idServicio: number, fecha: string): Observable<string[]> {
    return this.http
      .get<string[]>(`${this.baseUrl}/horarios-disponibles`, {
        headers: this.authHeaders(),
        params: { idServicio, fecha },
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  cancelar(
    idTurno: number,
    data: CancelarTurnoServicioRequest,
  ): Observable<TurnoServicioResponse> {
    return this.http
      .patch<TurnoServicioResponse>(`${this.baseUrl}/${idTurno}/cancelar`, data, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  private authHeaders(): HttpHeaders | undefined {
    const token = this.authService.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
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

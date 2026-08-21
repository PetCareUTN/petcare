import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  AppointmentStatus,
  RechazarTurnoVeterinarioRequest,
  TurnoVeterinarioResponse,
} from '../models/turno-veterinario';

@Injectable({ providedIn: 'root' })
export class TurnosVeterinariosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/turnos-veterinarios`;

  getMine(estado?: AppointmentStatus): Observable<TurnoVeterinarioResponse[]> {
    return this.http
      .get<TurnoVeterinarioResponse[]>(`${this.baseUrl}/mia`, {
        headers: this.authHeaders(),
        params: estado ? { estado } : {},
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  confirmar(idTurno: number): Observable<TurnoVeterinarioResponse> {
    return this.http
      .patch<TurnoVeterinarioResponse>(
        `${this.baseUrl}/${idTurno}/confirmar`,
        {},
        { headers: this.authHeaders() },
      )
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  rechazar(
    idTurno: number,
    data: RechazarTurnoVeterinarioRequest,
  ): Observable<TurnoVeterinarioResponse> {
    return this.http
      .patch<TurnoVeterinarioResponse>(`${this.baseUrl}/${idTurno}/rechazar`, data, {
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

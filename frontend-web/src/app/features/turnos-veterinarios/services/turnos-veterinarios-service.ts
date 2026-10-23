import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  AgendarTurnoError,
  AgendarTurnoVeterinarioRequest,
  AppointmentStatus,
  CancelarTurnoVeterinarioRequest,
  CapacidadHorario,
  RegistrarAsistenciaRequest,
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

  /** Capacidad y ocupación de mi agenda, franja por franja, entre dos fechas. */
  getAgenda(desde: string, hasta: string): Observable<CapacidadHorario[]> {
    return this.http
      .get<CapacidadHorario[]>(`${this.baseUrl}/mia/agenda`, {
        headers: this.authHeaders(),
        params: { desde, hasta },
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /**
   * Agenda un turno desde la veterinaria. Con el horario lleno responde 409 con
   * `codigo: 'CUPO_LLENO'`; repitiendo con `forzar: true` se agenda igual.
   */
  agendar(data: AgendarTurnoVeterinarioRequest): Observable<TurnoVeterinarioResponse> {
    return this.http
      .post<TurnoVeterinarioResponse>(`${this.baseUrl}/mia`, data, {
        headers: this.authHeaders(),
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          const body = error.error as Partial<AgendarTurnoError> | null;
          if (body && typeof body === 'object' && typeof body.mensaje === 'string') {
            return throwError(
              () =>
                ({
                  codigoEstado: body.codigoEstado ?? error.status,
                  mensaje: body.mensaje,
                  codigo: body.codigo,
                  cupos: body.cupos,
                  ocupados: body.ocupados,
                }) as AgendarTurnoError,
            );
          }
          return this.mapError(error);
        }),
      );
  }

  cancelar(
    idTurno: number,
    data: CancelarTurnoVeterinarioRequest,
  ): Observable<TurnoVeterinarioResponse> {
    return this.http
      .patch<TurnoVeterinarioResponse>(`${this.baseUrl}/${idTurno}/cancelar`, data, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /** Cierra el turno indicando si el cliente se presento (P1-193). */
  registrarAsistencia(
    idTurno: number,
    data: RegistrarAsistenciaRequest,
  ): Observable<TurnoVeterinarioResponse> {
    return this.http
      .patch<TurnoVeterinarioResponse>(`${this.baseUrl}/${idTurno}/asistencia`, data, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /** Vuelve el turno a confirmado. El backend solo lo permite el mismo dia. */
  revertirAsistencia(idTurno: number): Observable<TurnoVeterinarioResponse> {
    return this.http
      .delete<TurnoVeterinarioResponse>(`${this.baseUrl}/${idTurno}/asistencia`, {
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

import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import { ReporteDashboardVeterinario } from '../models/reporte-dashboard';

@Injectable({ providedIn: 'root' })
export class ReportesVeterinariosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/reportes-veterinarios`;

  getDashboard(desde?: string, hasta?: string): Observable<ReporteDashboardVeterinario> {
    let params = new HttpParams();
    if (desde) {
      params = params.set('desde', desde);
    }
    if (hasta) {
      params = params.set('hasta', hasta);
    }

    return this.http
      .get<ReporteDashboardVeterinario>(`${this.baseUrl}/dashboard`, {
        headers: this.authHeaders(),
        params,
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

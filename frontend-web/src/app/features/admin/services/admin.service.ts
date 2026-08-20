import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  AuditoriaRegistro,
  ListarUsuariosResponse,
  Rol,
  UsuarioAdmin,
} from '../models/admin';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  listarUsuarios(pagina = 1, limite = 20, busqueda?: string): Observable<ListarUsuariosResponse> {
    const headers = this.getAuthHeaders();
    let params: Record<string, string> = {
      pagina: String(pagina),
      limite: String(limite),
    };
    if (busqueda) {
      params = { ...params, busqueda };
    }
    return this.http
      .get<ListarUsuariosResponse>(`${this.baseUrl}/usuarios`, { headers, params })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  obtenerUsuario(id: number): Observable<UsuarioAdmin> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<UsuarioAdmin>(`${this.baseUrl}/usuarios/${id}`, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  cambiarRol(id: number, idRol: number): Observable<UsuarioAdmin> {
    const headers = this.getAuthHeaders();
    return this.http
      .patch<UsuarioAdmin>(`${this.baseUrl}/usuarios/${id}/rol`, { idRol }, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  listarRoles(): Observable<Rol[]> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<Rol[]>(`${this.baseUrl}/roles`, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  obtenerHistorial(id: number): Observable<AuditoriaRegistro[]> {
    const headers = this.getAuthHeaders();
    return this.http
      .get<AuditoriaRegistro[]>(`${this.baseUrl}/usuarios/${id}/auditoria`, { headers })
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

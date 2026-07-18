import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import { CreateMascotaRequest, MascotaResponse } from '../models/mascota';

@Injectable({ providedIn: 'root' })
export class MascotasService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/mascotas`;

  create(data: CreateMascotaRequest, foto?: File): Observable<MascotaResponse> {
    const token = this.authService.getToken();
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : undefined;
    const formData = this.buildFormData(data, foto);

    return this.http
      .post<MascotaResponse>(this.baseUrl, formData, { headers })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  private buildFormData(data: CreateMascotaRequest, foto?: File): FormData {
    const formData = new FormData();
    formData.append('nombre', data.nombre);
    formData.append('especie', data.especie);
    formData.append('sexo', data.sexo);
    formData.append('esterilizado', String(data.esterilizado ?? false));

    if (data.raza) {
      formData.append('raza', data.raza);
    }
    if (data.fechaNacimiento) {
      formData.append('fechaNacimiento', data.fechaNacimiento);
    }
    if (data.peso !== undefined) {
      formData.append('peso', String(data.peso));
    }
    if (data.observaciones) {
      formData.append('observaciones', data.observaciones);
    }
    if (foto) {
      formData.append('foto', foto);
    }

    return formData;
  }

  private mapError(error: HttpErrorResponse): Observable<never> {
    const body = error.error as Partial<ApiError> | null;
    const apiError: ApiError =
      body && typeof body === 'object' && typeof body.mensaje === 'string'
        ? { codigoEstado: body.codigoEstado ?? error.status, mensaje: body.mensaje }
        : {
            codigoEstado: error.status || 0,
            mensaje: 'No se pudo conectar con el servidor. Intenta de nuevo.',
          };
    return throwError(() => apiError);
  }
}

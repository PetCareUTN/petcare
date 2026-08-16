import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import {
  CreateMascotaRequest,
  MascotaOwner,
  MascotaResponse,
  UpdateMascotaRequest,
} from '../models/mascota';

@Injectable({ providedIn: 'root' })
export class MascotasService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly baseUrl = `${environment.apiUrl}/mascotas`;

  create(data: CreateMascotaRequest, foto?: File): Observable<MascotaResponse> {
    const formData = this.buildFormData(data, foto);

    return this.http
      .post<MascotaResponse>(this.baseUrl, formData, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  findOwner(query: { email?: string; documento?: string }): Observable<MascotaOwner> {
    return this.http
      .get<MascotaOwner>(`${this.baseUrl}/duenos/buscar`, {
        headers: this.authHeaders(),
        params: {
          ...(query.email ? { email: query.email } : {}),
          ...(query.documento ? { documento: query.documento } : {}),
        },
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  findByOwner(idUsuario: number): Observable<MascotaResponse[]> {
    return this.http
      .get<MascotaResponse[]>(`${this.baseUrl}/duenos/${idUsuario}`, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  createForOwner(
    idUsuario: number,
    data: CreateMascotaRequest,
    foto?: File,
  ): Observable<MascotaResponse> {
    const formData = this.buildFormData(data, foto);

    return this.http
      .post<MascotaResponse>(`${this.baseUrl}/duenos/${idUsuario}`, formData, {
        headers: this.authHeaders(),
      })
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
    if (data.alergias) {
      formData.append('alergias', data.alergias);
    }
    if (foto) {
      formData.append('foto', foto);
    }

    return formData;
  }

  update(id: number, data: UpdateMascotaRequest, foto?: File): Observable<MascotaResponse> {
    const formData = this.buildUpdateFormData(data, foto);

    return this.http
      .patch<MascotaResponse>(`${this.baseUrl}/${id}`, formData, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /**
   * A diferencia del alta, en la edición un string vacío es un valor válido
   * (permite limpiar un campo), así que solo se omiten los `undefined`.
   */
  private buildUpdateFormData(data: UpdateMascotaRequest, foto?: File): FormData {
    const formData = new FormData();

    if (data.nombre !== undefined) {
      formData.append('nombre', data.nombre);
    }
    if (data.especie !== undefined) {
      formData.append('especie', data.especie);
    }
    if (data.raza !== undefined) {
      formData.append('raza', data.raza);
    }
    if (data.sexo !== undefined) {
      formData.append('sexo', data.sexo);
    }
    if (data.fechaNacimiento !== undefined) {
      formData.append('fechaNacimiento', data.fechaNacimiento);
    }
    if (data.peso !== undefined) {
      formData.append('peso', String(data.peso));
    }
    if (data.esterilizado !== undefined) {
      formData.append('esterilizado', String(data.esterilizado));
    }
    if (data.observaciones !== undefined) {
      formData.append('observaciones', data.observaciones);
    }
    if (data.alergias !== undefined) {
      formData.append('alergias', data.alergias);
    }
    if (foto) {
      formData.append('foto', foto);
    }

    return formData;
  }

  getById(
    id: number,
    context?: { ownerDocument?: string; ownerEmail?: string },
  ): Observable<MascotaResponse> {
    return this.http
      .get<MascotaResponse>(`${this.baseUrl}/${id}`, {
        headers: this.authHeaders(),
        params: {
          ...(context?.ownerDocument ? { ownerDocument: context.ownerDocument } : {}),
          ...(context?.ownerEmail ? { ownerEmail: context.ownerEmail } : {}),
        },
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  getMine(): Observable<MascotaResponse[]> {
    return this.http
      .get<MascotaResponse[]>(this.baseUrl, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /**
   * El backend guarda `foto` como ruta relativa (p. ej. `/uploads/mascotas/x.png`),
   * servida desde su propio origen. El frontend corre en otro puerto, así que hay
   * que anteponerle la URL de la API para que el navegador la resuelva bien.
   */
  resolveFotoUrl(foto: string | null): string | null {
    if (!foto) {
      return null;
    }
    return foto.startsWith('http') ? foto : `${environment.apiUrl}${foto}`;
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
            mensaje: 'No se pudo conectar con el servidor. Intenta de nuevo.',
          };
    return throwError(() => apiError);
  }
}

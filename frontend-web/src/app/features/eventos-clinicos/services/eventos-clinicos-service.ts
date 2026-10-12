import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiError } from '../../auth/models/user';
import { AuthService } from '../../auth/services/auth-service';
import { ArchivoProtegidoService } from '../../../shared/services/archivo-protegido-service';
import {
  ArchivoMedicoResponse,
  CreateEventoClinicoRequest,
  EventoClinicoResponse,
  HistoriaClinicaResponse,
  SugerenciaEventoClinico,
} from '../models/evento-clinico';

@Injectable({ providedIn: 'root' })
export class EventosClinicosService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly archivoProtegido = inject(ArchivoProtegidoService);
  private readonly baseUrl = `${environment.apiUrl}/eventos-clinicos`;

  create(data: CreateEventoClinicoRequest): Observable<EventoClinicoResponse> {
    return this.http
      .post<EventoClinicoResponse>(this.baseUrl, data, { headers: this.authHeaders() })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /** Ordena en campos una consulta dictada (P1-182). No guarda nada. */
  sugerirCampos(transcripcion: string): Observable<SugerenciaEventoClinico> {
    return this.http
      .post<SugerenciaEventoClinico>(
        `${this.baseUrl}/asistente`,
        { transcripcion },
        { headers: this.authHeaders() },
      )
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  getByMascota(
    idMascota: number,
    context?: { ownerDocument?: string; ownerEmail?: string },
  ): Observable<HistoriaClinicaResponse> {
    return this.http
      .get<HistoriaClinicaResponse>(`${this.baseUrl}/mascota/${idMascota}`, {
        headers: this.authHeaders(),
        params: {
          ...(context?.ownerDocument ? { ownerDocument: context.ownerDocument } : {}),
          ...(context?.ownerEmail ? { ownerEmail: context.ownerEmail } : {}),
        },
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  agregarArchivos(idEvento: number, archivos: File[]): Observable<ArchivoMedicoResponse[]> {
    const formData = new FormData();
    archivos.forEach((archivo) => formData.append('archivos', archivo));

    return this.http
      .post<ArchivoMedicoResponse[]>(`${this.baseUrl}/${idEvento}/archivos-medicos`, formData, {
        headers: this.authHeaders(),
      })
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  /**
   * Abre un archivo médico en otra pestaña. El backend lo entrega solo con
   * sesión (ver ArchivoProtegidoService), y con el mismo contexto de atención
   * que se usó para ver la historia: sin él, un veterinario que llegó a la
   * mascota buscando al dueño recibiría un 403 al abrir el archivo.
   */
  abrirArchivo(
    url: string,
    context?: { ownerDocument?: string; ownerEmail?: string },
  ): Observable<void> {
    const params = new URLSearchParams();
    if (context?.ownerDocument) params.set('ownerDocument', context.ownerDocument);
    if (context?.ownerEmail) params.set('ownerEmail', context.ownerEmail);
    const query = params.toString();
    return this.archivoProtegido.abrir(query ? `${url}?${query}` : url);
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

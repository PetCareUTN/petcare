import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth-service';
import { CategoriaServicio } from '../servicios/models/servicio';

export interface SolicitudPrestador {
  id: number;
  idUsuario: number;
  categoria: CategoriaServicio;
  estado: 'pendiente' | 'correccion' | 'aprobado' | 'rechazado' | 'suspendido';
  actualizada: string;
  identidadRevisada: boolean;
  contactoVerificado: boolean;
  referenciasComprobadas: boolean;
  datos: {
    nombreCompleto: string;
    numeroDocumento: string;
    telefono: string;
    experiencia: string;
    referencias: string;
    protocolo: string;
    direccion: string;
    capacidad: number | null;
  };
  historial: { estado: string; motivo: string; fecha: string; idAdmin: number | null }[];
  documentos: { id: number; tipo: string; mime: string; vence: string }[];
}
export interface Reporte {
  id: number;
  idTurno: number;
  idSolicitud: number | null;
  prestador: string;
  denunciante: string;
  categoria: string;
  motivo: string;
  estado: string;
  resolucion: string | null;
}
export const categoriasPrestador: { value: CategoriaServicio; label: string }[] = [
  { value: 'paseador', label: 'Paseador' },
  { value: 'guarderia', label: 'Guardería' },
  { value: 'peluqueria', label: 'Peluquería' },
];
export const mensajeError = (e: unknown) =>
  e instanceof Error ? e.message : 'No se pudo completar la operación.';

@Injectable({ providedIn: 'root' })
export class PrestadoresService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = `${environment.apiUrl}/prestadores`;
  private headers() {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }
  private error(e: HttpErrorResponse) {
    return throwError(
      () =>
        new Error(e.error?.mensaje ?? e.error?.message ?? 'No se pudo conectar con el servidor.'),
    );
  }
  get<T>(path: string) {
    return this.http
      .get<T>(`${this.base}/${path}`, { headers: this.headers() })
      .pipe(catchError((e) => this.error(e)));
  }
  post<T = unknown>(path: string, body: unknown) {
    return this.http
      .post<T>(`${this.base}/${path}`, body, { headers: this.headers() })
      .pipe(catchError((e) => this.error(e)));
  }
  descargar(id: number) {
    return this.http.get(`${this.base}/documentos/${id}`, {
      headers: this.headers(),
      responseType: 'blob',
    });
  }
}

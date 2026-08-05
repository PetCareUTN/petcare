import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiError,
  ForgotPasswordRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  ResetPasswordRequest,
} from '../models/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auth`;
  private readonly tokenStorageKey = 'petcare_token';
  private readonly roleStorageKey = 'petcare_id_rol';

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<RegisterResponse>(`${this.baseUrl}/register`, data)
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, data)
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<{ mensaje: string }> {
    return this.http
      .post<{ mensaje: string }>(`${this.baseUrl}/olvide-contrasena`, data)
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  resetPassword(data: ResetPasswordRequest): Observable<{ mensaje: string }> {
    return this.http
      .patch<{ mensaje: string }>(`${this.baseUrl}/restablecer-contrasena`, data)
      .pipe(catchError((error: HttpErrorResponse) => this.mapError(error)));
  }

  saveToken(token: string): void {
    localStorage.setItem(this.tokenStorageKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.roleStorageKey);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  saveRole(idRol: number): void {
    localStorage.setItem(this.roleStorageKey, String(idRol));
  }

  /** 1: dueño_mascota | 2: veterinario | 3: administrador | 4: prestador */
  getRoleId(): number | null {
    const stored = localStorage.getItem(this.roleStorageKey);
    return stored ? Number(stored) : null;
  }

  isVeterinario(): boolean {
    return this.getRoleId() === 2;
  }

  /**
   * Normaliza el error HTTP al contrato { codigoEstado, mensaje } que usa el
   * backend. Si no hay respuesta del servidor (p. ej. está caído), devuelve un
   * mensaje de conexión genérico.
   */
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

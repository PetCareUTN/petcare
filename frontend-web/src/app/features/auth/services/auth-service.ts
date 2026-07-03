import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  ApiError,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from '../models/user';

// id_rol por defecto al registrarse (dueño_mascota), fijado server-side en
// backend/src/auth/auth.service.ts de la rama feature/registro-usuario.
const DEFAULT_ID_ROL = 1;

/**
 * TODO(auth-integration): esta implementación es un mock en memoria. El contrato de register()
 * ya está alineado con la implementación real de Simon (backend/src/auth/dto/register.dto.ts y
 * register-response.dto.ts en feature/registro-usuario): POST /auth/register, sin `rol` en el
 * request, response en snake_case. login() sigue siendo provisorio porque todavía no existe un
 * endpoint ni DTO real para /auth/login — confirmar con Mauricio antes de integrar.
 * Reemplazar el cuerpo de register()/login() por HttpClient.post(`${environment.apiUrl}/auth/...`, ...)
 * una vez el backend esté desplegado.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenStorageKey = 'petcare_token';
  private nextId = 1;
  private readonly registeredUsers: (RegisterResponse & { password: string })[] = [];

  register(data: RegisterRequest): Observable<RegisterResponse> {
    const emailExists = this.registeredUsers.some(
      (user) => user.email.toLowerCase() === data.email.toLowerCase(),
    );
    if (emailExists) {
      return this.mockError(409, 'El email ya se encuentra registrado');
    }

    const created: RegisterResponse & { password: string } = {
      id_usuario: this.nextId++,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      id_rol: DEFAULT_ID_ROL,
      estado: 'activo',
      fecha_registro: new Date().toISOString(),
      password: data.password,
    };
    this.registeredUsers.push(created);

    const { password, ...response } = created;
    return of(response).pipe(delay(300));
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    const user = this.registeredUsers.find(
      (candidate) => candidate.email.toLowerCase() === data.email.toLowerCase(),
    );
    if (!user || user.password !== data.password) {
      return this.mockError(401, 'Email o contraseña incorrectos');
    }

    const { password, ...usuario } = user;
    const response: LoginResponse = {
      token: `mock-token-${usuario.id_usuario}`,
      usuario,
    };
    return of(response).pipe(delay(300));
  }

  saveToken(token: string): void {
    localStorage.setItem(this.tokenStorageKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenStorageKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenStorageKey);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  private mockError(codigoEstado: number, mensaje: string): Observable<never> {
    const error: ApiError = { codigoEstado, mensaje };
    return throwError(() => error).pipe(delay(300));
  }
}

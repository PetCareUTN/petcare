import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { ApiError, LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from '../models/user';

/**
 * TODO(auth-integration): esta implementación es un mock en memoria mientras se confirma
 * con Simon si el endpoint real es POST /auth/register o POST /auth/registro (ver
 * backend/test/auth-register.e2e-spec.ts, alineado a la entidad Usuario). Reemplazar el
 * cuerpo de register()/login() por HttpClient.post(`${environment.apiUrl}/auth/register`, ...)
 * respetando la misma forma de RegisterRequest/RegisterResponse una vez esté disponible.
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
      idUsuario: this.nextId++,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      rol: data.rol,
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
      token: `mock-token-${usuario.idUsuario}`,
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

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth-service';

/**
 * Abre en otra pestaña un archivo que el backend solo entrega con sesión:
 * archivos médicos y documentos de veterinarios.
 *
 * Un `<a href>` no sirve para estos, porque el navegador no manda el token
 * al seguir un link. Se descarga con HttpClient (con el header de
 * autorización) y se abre el blob resultante.
 */
@Injectable({ providedIn: 'root' })
export class ArchivoProtegidoService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * [url] puede ser absoluta o relativa a la API.
   *
   * La pestaña se abre antes de pedir el archivo, mientras todavía dura el
   * click del usuario: si se abriera después de la descarga, el navegador la
   * trataría como popup y la bloquearía.
   */
  abrir(url: string): Observable<void> {
    const pestania = window.open('', '_blank');
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    const urlCompleta = url.startsWith('http') ? url : `${environment.apiUrl}${url}`;

    return this.http.get(urlCompleta, { headers, responseType: 'blob' }).pipe(
      tap({
        next: (archivo) => {
          const objectUrl = URL.createObjectURL(archivo);
          if (pestania) {
            pestania.location.href = objectUrl;
          } else {
            window.open(objectUrl, '_blank');
          }
          // La pestaña ya lo cargó; se libera después para no retener el archivo en memoria.
          setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
        },
        error: () => pestania?.close(),
      }),
      map(() => undefined),
    );
  }
}

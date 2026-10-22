import { Injectable, inject } from '@angular/core';
import { Observable, OperatorFunction, catchError, forkJoin, map, of } from 'rxjs';
import { MascotaOwner } from '../models/mascota';
import { MascotasService } from './mascotas-service';

/** Mínimos para no consultar con textos que todavía no identifican a nadie. */
const MIN_NAME_CHARS = 2;
const MIN_DOCUMENT_DIGITS = 6;
const MAX_RESULTS = 8;

/**
 * Búsqueda de clientes con una sola barra: el texto decide el tipo. Con "@" es
 * un email, con solo números un DNI (ambos exactos) y, si no, un nombre. La
 * usan Atención veterinaria y el alta de turnos de la agenda.
 */
@Injectable({ providedIn: 'root' })
export class BusquedaClientesService {
  private readonly mascotasService = inject(MascotasService);

  puedeBuscar(texto: string): boolean {
    const query = texto.trim();
    if (query.includes('@')) {
      return true;
    }
    if (/^\d+$/.test(query)) {
      return query.length >= MIN_DOCUMENT_DIGITS;
    }
    return query.length >= MIN_NAME_CHARS;
  }

  /** Pista para mostrar mientras el texto todavía no alcanza para buscar. */
  pista(texto: string): string | null {
    const query = texto.trim();
    if (!query || query.includes('@')) {
      return null;
    }
    if (/^\d+$/.test(query) && query.length < MIN_DOCUMENT_DIGITS) {
      return 'Seguí escribiendo el DNI completo.';
    }
    if (!/^\d+$/.test(query) && query.length < MIN_NAME_CHARS) {
      return 'Escribí al menos 2 letras.';
    }
    return null;
  }

  /**
   * Para el nombre se prueban las combinaciones nombre/apellido porque el
   * backend filtra cada campo por separado y quien escribe puede usar
   * cualquier orden.
   */
  buscar(texto: string): Observable<MascotaOwner[]> {
    const query = texto.trim();
    const sinResultados = (): OperatorFunction<MascotaOwner[], MascotaOwner[]> =>
      catchError(() => of([] as MascotaOwner[]));

    if (query.includes('@')) {
      return this.mascotasService
        .findOwner({ email: query.toLowerCase() })
        .pipe(map((owner) => [owner]), sinResultados());
    }
    if (/^\d+$/.test(query)) {
      return this.mascotasService
        .findOwner({ documento: query })
        .pipe(map((owner) => [owner]), sinResultados());
    }

    const palabras = query.split(/\s+/);
    const consultas = [
      this.mascotasService.findAllOwners({ nombre: query }),
      this.mascotasService.findAllOwners({ apellido: query }),
    ];
    if (palabras.length > 1) {
      const primera = palabras[0];
      const resto = palabras.slice(1).join(' ');
      const ultima = palabras[palabras.length - 1];
      const anteriores = palabras.slice(0, -1).join(' ');
      consultas.push(
        this.mascotasService.findAllOwners({ nombre: primera, apellido: resto }),
        this.mascotasService.findAllOwners({ nombre: ultima, apellido: anteriores }),
      );
    }

    return forkJoin(consultas.map((consulta) => consulta.pipe(sinResultados()))).pipe(
      map((listas) => {
        const porId = new Map<number, MascotaOwner>();
        for (const owner of listas.flat()) {
          porId.set(owner.id_usuario, owner);
        }
        return [...porId.values()].slice(0, MAX_RESULTS);
      }),
    );
  }
}

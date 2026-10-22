import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  OperatorFunction,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import { MascotaOwner, MascotaResponse } from '../../../mascotas/models/mascota';
import { MascotasService } from '../../../mascotas/services/mascotas-service';
import { ListaClientesModal } from '../../components/lista-clientes/lista-clientes';

type AttentionStep = 'cliente' | 'mascota' | 'evento';

/** Espera tras la última tecla antes de consultar al backend. */
const SEARCH_DEBOUNCE_MS = 300;
/** Mínimos para no consultar con textos que todavía no identifican a nadie. */
const MIN_NAME_CHARS = 2;
const MIN_DOCUMENT_DIGITS = 6;
const MAX_RESULTS = 8;

/** Cuánto queda visible el cartel temporal de "mascota registrada". */
const TOAST_DURATION_MS = 4000;

@Component({
  selector: 'app-buscar-mascota',
  imports: [FormsModule, RouterLink, ListaClientesModal],
  templateUrl: './buscar-mascota.html',
  styleUrl: './buscar-mascota.css',
})
export class BuscarMascotaPage implements OnInit {
  protected readonly mascotasService = inject(MascotasService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly toastMessage = signal<string | null>(null);
  protected readonly isListaClientesOpen = signal(false);

  protected readonly searchQuery = signal('');
  protected readonly searchResults = signal<MascotaOwner[]>([]);
  protected readonly activeResultIndex = signal(0);
  protected readonly isSearchingOwner = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly isLoadingOwnerPets = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly ownerPets = signal<MascotaResponse[]>([]);
  protected readonly selectedOwner = signal<MascotaOwner | null>(null);
  protected readonly selectedPet = signal<MascotaResponse | null>(null);
  private readonly searchInput$ = new Subject<string>();
  private readonly petIdToRestore = signal<number | null>(null);

  protected readonly currentStep = computed<AttentionStep>(() => {
    if (!this.selectedOwner()) {
      return 'cliente';
    }
    if (!this.selectedPet()) {
      return 'mascota';
    }
    return 'evento';
  });

  protected readonly searchHint = computed(() => {
    const query = this.searchQuery().trim();
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
  });

  constructor() {
    this.searchInput$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        tap((query) => {
          this.isSearchingOwner.set(this.puedeBuscar(query));
        }),
        switchMap((query) => (this.puedeBuscar(query) ? this.buscarClientes(query) : of(null))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultados) => {
        this.isSearchingOwner.set(false);
        this.activeResultIndex.set(0);
        this.hasSearched.set(resultados !== null);
        this.searchResults.set(resultados ?? []);
      });
  }

  protected ownerDisplayName(owner: MascotaOwner): string {
    return [owner.nombre, owner.apellido].filter(Boolean).join(' ');
  }

  protected ownerInitials(owner: MascotaOwner): string {
    return (
      [owner.nombre, owner.apellido]
        .filter((parte): parte is string => !!parte)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('') || '?'
    );
  }

  private mostrarToast(mensaje: string): void {
    this.toastMessage.set(mensaje);
    setTimeout(() => this.toastMessage.set(null), TOAST_DURATION_MS);
  }

  ngOnInit(): void {
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument')?.trim() ?? '';
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail')?.trim() ?? '';
    const selectedPetId = Number(this.route.snapshot.queryParamMap.get('selectedPetId'));
    const mascotaCreada = this.route.snapshot.queryParamMap.get('mascotaCreada');

    if (Number.isInteger(selectedPetId) && selectedPetId > 0) {
      this.petIdToRestore.set(selectedPetId);
    }

    if (mascotaCreada) {
      this.mostrarToast(`Mascota ${mascotaCreada} registrada con éxito.`);
      // Se saca de la URL para que un refresh no vuelva a mostrar el cartel.
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { mascotaCreada: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    const restoreQuery = ownerDocument || ownerEmail;
    if (restoreQuery) {
      this.restaurarCliente(restoreQuery);
    }
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.hasSearched.set(false);
    this.searchResults.set([]);
    this.searchInput$.next(value.trim());
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    const total = this.searchResults().length;
    if (event.key === 'ArrowDown' && total > 0) {
      event.preventDefault();
      this.activeResultIndex.update((index) => (index + 1) % total);
    } else if (event.key === 'ArrowUp' && total > 0) {
      event.preventDefault();
      this.activeResultIndex.update((index) => (index - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const elegido = this.searchResults()[this.activeResultIndex()];
      if (elegido) {
        this.seleccionarCliente(elegido);
      }
    } else if (event.key === 'Escape') {
      this.limpiarBusqueda();
    }
  }

  protected limpiarBusqueda(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.isSearchingOwner.set(false);
    this.searchInput$.next('');
  }

  protected clearOwnerSelection(): void {
    this.selectedOwner.set(null);
    this.selectedPet.set(null);
    this.ownerPets.set([]);
    this.errorMessage.set(null);
    this.petIdToRestore.set(null);
  }

  protected abrirListaClientes(): void {
    this.isListaClientesOpen.set(true);
  }

  protected seleccionarClienteDeLista(owner: MascotaOwner): void {
    this.isListaClientesOpen.set(false);
    this.seleccionarCliente(owner);
  }

  protected seleccionarCliente(owner: MascotaOwner): void {
    this.limpiarBusqueda();
    this.errorMessage.set(null);
    this.selectedPet.set(null);
    this.petIdToRestore.set(null);
    this.selectedOwner.set(owner);
    this.loadOwnerPets(owner.id_usuario);
  }

  protected selectPet(pet: MascotaResponse): void {
    this.petIdToRestore.set(pet.idMascota);
    this.selectedPet.set(pet);
  }

  protected attentionQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const owner = this.selectedOwner();
    const pet = this.selectedPet();

    if (owner?.numero_documento) {
      params['ownerDocument'] = owner.numero_documento;
    } else if (owner?.email) {
      params['ownerEmail'] = owner.email;
    }

    if (pet) {
      params['selectedPetId'] = pet.idMascota;
    }

    return params;
  }

  protected clinicalEventQueryParams(pet: MascotaResponse): Record<string, string | number> {
    return {
      ...this.attentionQueryParams(),
      idMascota: pet.idMascota,
      selectedPetId: pet.idMascota,
    };
  }

  private puedeBuscar(query: string): boolean {
    if (query.includes('@')) {
      return true;
    }
    if (/^\d+$/.test(query)) {
      return query.length >= MIN_DOCUMENT_DIGITS;
    }
    return query.length >= MIN_NAME_CHARS;
  }

  /**
   * Una sola barra para todo: el texto decide el tipo de búsqueda. Con "@" es
   * un email, con solo números un DNI (ambos exactos) y, si no, un nombre. Para
   * el nombre se prueban las combinaciones nombre/apellido porque el backend
   * filtra cada campo por separado y quien escribe puede usar cualquier orden.
   */
  private buscarClientes(texto: string): Observable<MascotaOwner[]> {
    const sinResultados = (): OperatorFunction<MascotaOwner[], MascotaOwner[]> =>
      catchError(() => of([] as MascotaOwner[]));

    if (texto.includes('@')) {
      return this.mascotasService
        .findOwner({ email: texto.toLowerCase() })
        .pipe(map((owner) => [owner]), sinResultados());
    }
    if (/^\d+$/.test(texto)) {
      return this.mascotasService
        .findOwner({ documento: texto })
        .pipe(map((owner) => [owner]), sinResultados());
    }

    const palabras = texto.split(/\s+/);
    const consultas = [
      this.mascotasService.findAllOwners({ nombre: texto }),
      this.mascotasService.findAllOwners({ apellido: texto }),
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

  /** Vuelve a seleccionar al cliente cuando se regresa desde otra pantalla. */
  private restaurarCliente(valor: string): void {
    this.isSearchingOwner.set(true);
    const consulta = valor.includes('@')
      ? this.mascotasService.findOwner({ email: valor.toLowerCase() })
      : this.mascotasService.findOwner({ documento: valor });
    consulta.subscribe({
      next: (owner) => {
        this.isSearchingOwner.set(false);
        this.selectedOwner.set(owner);
        this.loadOwnerPets(owner.id_usuario);
      },
      error: () => this.isSearchingOwner.set(false),
    });
  }

  private loadOwnerPets(ownerId: number): void {
    this.isLoadingOwnerPets.set(true);
    this.mascotasService.findByOwner(ownerId).subscribe({
      next: (pets) => {
        this.isLoadingOwnerPets.set(false);
        this.ownerPets.set(pets);
        const petId = this.petIdToRestore();
        const petToRestore = pets.find((pet) => pet.idMascota === petId);
        if (petToRestore) {
          this.selectedPet.set(petToRestore);
        }
      },
      error: (error: ApiError) => {
        this.isLoadingOwnerPets.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar las mascotas del cliente.');
      },
    });
  }
}

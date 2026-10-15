import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { MascotaOwner, MascotaResponse } from '../../../mascotas/models/mascota';
import { MascotasService } from '../../../mascotas/services/mascotas-service';
import { ListaClientesModal } from '../../components/lista-clientes/lista-clientes';

type AttentionStep = 'cliente' | 'mascota' | 'evento';
type OwnerSearchMode = 'documento' | 'email';

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

  protected readonly toastMessage = signal<string | null>(null);
  protected readonly isListaClientesOpen = signal(false);

  protected readonly isSearchingOwner = signal(false);
  protected readonly isLoadingOwnerPets = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly ownerSearchMessage = signal<string | null>(null);
  protected readonly ownerPets = signal<MascotaResponse[]>([]);
  protected readonly selectedOwner = signal<MascotaOwner | null>(null);
  protected readonly selectedPet = signal<MascotaResponse | null>(null);
  protected readonly ownerDocument = signal('');
  protected readonly ownerEmail = signal('');
  protected readonly ownerSearchMode = signal<OwnerSearchMode>('documento');
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

  protected ownerDisplayName(owner: MascotaOwner): string {
    return [owner.nombre, owner.apellido].filter(Boolean).join(' ');
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

    if (ownerDocument) {
      this.ownerSearchMode.set('documento');
      this.ownerDocument.set(ownerDocument);
      this.searchOwner();
      return;
    }

    if (ownerEmail) {
      this.ownerSearchMode.set('email');
      this.ownerEmail.set(ownerEmail);
      this.searchOwner();
    }
  }

  protected setOwnerSearchMode(mode: OwnerSearchMode): void {
    this.ownerSearchMode.set(mode);
    this.ownerSearchMessage.set(null);
    if (mode === 'documento') {
      this.ownerEmail.set('');
      return;
    }
    this.ownerDocument.set('');
  }

  protected clearOwnerSelection(): void {
    this.selectedOwner.set(null);
    this.selectedPet.set(null);
    this.ownerPets.set([]);
    this.ownerSearchMessage.set(null);
    this.petIdToRestore.set(null);
  }

  protected searchOwner(): void {
    const mode = this.ownerSearchMode();
    const documento = mode === 'documento' ? this.ownerDocument().trim() : '';
    const email = mode === 'email' ? this.ownerEmail().trim().toLowerCase() : '';

    this.ownerSearchMessage.set(null);
    this.errorMessage.set(null);
    this.selectedOwner.set(null);
    this.selectedPet.set(null);
    this.ownerPets.set([]);

    if (mode === 'documento' && !documento) {
      this.ownerSearchMessage.set('Ingresá el DNI para buscar al cliente.');
      return;
    }

    if (mode === 'email' && !email) {
      this.ownerSearchMessage.set('Ingresá el email para buscar al cliente.');
      return;
    }

    if (documento && !/^[0-9]+$/.test(documento)) {
      this.ownerSearchMessage.set('El DNI solo puede contener números.');
      return;
    }

    this.isSearchingOwner.set(true);
    this.mascotasService
      .findOwner({ documento: documento || undefined, email: email || undefined })
      .subscribe({
        next: (owner) => {
          this.isSearchingOwner.set(false);
          this.selectedOwner.set(owner);
          this.loadOwnerPets(owner.id_usuario);
        },
        error: (error: ApiError) => {
          this.isSearchingOwner.set(false);
          this.ownerSearchMessage.set(error.mensaje ?? 'No se encontró un cliente con esos datos.');
        },
      });
  }

  protected abrirListaClientes(): void {
    this.isListaClientesOpen.set(true);
  }

  protected seleccionarClienteDeLista(owner: MascotaOwner): void {
    this.isListaClientesOpen.set(false);
    this.ownerSearchMessage.set(null);
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

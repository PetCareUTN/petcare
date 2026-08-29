import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import { MascotaOwner } from '../../../mascotas/models/mascota';
import { MascotasService } from '../../../mascotas/services/mascotas-service';

/**
 * Directorio completo de clientes de la veterinaria, filtrable por nombre y
 * apellido. Se abre desde "Buscar cliente" para cuando la veterinaria no
 * tiene a mano el DNI o el email exacto del dueño.
 */
@Component({
  selector: 'app-lista-clientes',
  imports: [FormsModule],
  templateUrl: './lista-clientes.html',
  styleUrl: './lista-clientes.css',
})
export class ListaClientesModal implements OnInit {
  private readonly mascotasService = inject(MascotasService);

  protected readonly nombre = signal('');
  protected readonly apellido = signal('');
  protected readonly clientes = signal<MascotaOwner[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  readonly cerrar = output<void>();
  readonly seleccionar = output<MascotaOwner>();

  ngOnInit(): void {
    this.filtrar();
  }

  protected ownerDisplayName(owner: MascotaOwner): string {
    return [owner.apellido, owner.nombre].filter(Boolean).join(', ');
  }

  protected filtrar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.mascotasService
      .findAllOwners({
        nombre: this.nombre().trim() || undefined,
        apellido: this.apellido().trim() || undefined,
      })
      .subscribe({
        next: (clientes) => {
          this.isLoading.set(false);
          this.clientes.set(clientes);
        },
        error: (error: ApiError) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.mensaje ?? 'No se pudo cargar la lista de clientes.');
        },
      });
  }

  protected limpiarFiltros(): void {
    this.nombre.set('');
    this.apellido.set('');
    this.filtrar();
  }
}

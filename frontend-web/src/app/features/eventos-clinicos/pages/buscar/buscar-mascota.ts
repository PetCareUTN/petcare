import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { MascotaResponse } from '../../../mascotas/models/mascota';
import { MascotasService } from '../../../mascotas/services/mascotas-service';

@Component({
  selector: 'app-buscar-mascota',
  imports: [FormsModule, RouterLink],
  templateUrl: './buscar-mascota.html',
  styleUrl: './buscar-mascota.css',
})
export class BuscarMascotaPage implements OnInit {
  protected readonly mascotasService = inject(MascotasService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly mascotas = signal<MascotaResponse[]>([]);
  protected readonly searchQuery = signal('');

  protected readonly filteredMascotas = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return [];
    }
    return this.mascotas().filter(
      (pet) =>
        String(pet.idMascota).includes(query) || pet.nombre.toLowerCase().includes(query),
    );
  });

  ngOnInit(): void {
    this.mascotasService.getMine().subscribe({
      next: (mascotas) => {
        this.isLoading.set(false);
        this.mascotas.set(mascotas);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar tus pacientes.');
      },
    });
  }
}

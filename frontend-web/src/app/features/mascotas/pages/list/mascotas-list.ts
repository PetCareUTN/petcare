import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { MascotaResponse } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

@Component({
  selector: 'app-mascotas-list',
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './mascotas-list.html',
  styleUrl: './mascotas-list.css',
})
export class MascotasListPage implements OnInit {
  protected readonly mascotasService = inject(MascotasService);
  private readonly route = inject(ActivatedRoute);

  protected readonly heading: string = this.route.snapshot.data['heading'] ?? 'Mis mascotas';
  protected readonly showHistoriaClinica: boolean =
    this.route.snapshot.data['showHistoriaClinica'] ?? false;

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly mascotas = signal<MascotaResponse[]>([]);
  protected readonly searchQuery = signal('');

  protected readonly filteredMascotas = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.mascotas();
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
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar tus mascotas.');
      },
    });
  }
}

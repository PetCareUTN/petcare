import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { MascotaResponse } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

@Component({
  selector: 'app-mascotas-list',
  imports: [RouterLink],
  templateUrl: './mascotas-list.html',
  styleUrl: './mascotas-list.css',
})
export class MascotasListPage implements OnInit {
  private readonly mascotasService = inject(MascotasService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly mascotas = signal<MascotaResponse[]>([]);

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

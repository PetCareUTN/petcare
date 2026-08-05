import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { MascotaResponse } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

@Component({
  selector: 'app-mascotas-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './mascotas-list.html',
  styleUrl: './mascotas-list.css',
})
export class MascotasListPage implements OnInit {
  protected readonly mascotasService = inject(MascotasService);
  private readonly route = inject(ActivatedRoute);

  protected readonly heading: string = this.route.snapshot.data['heading'] ?? 'Mis mascotas';

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

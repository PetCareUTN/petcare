import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { MascotaResponse } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

@Component({
  selector: 'app-mascota-profile',
  imports: [RouterLink],
  templateUrl: './mascota-profile.html',
  styleUrl: './mascota-profile.css',
})
export class MascotaProfilePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly mascotasService = inject(MascotasService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly mascota = signal<MascotaResponse | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.mascotasService.getById(id).subscribe({
      next: (mascota) => {
        this.isLoading.set(false);
        this.mascota.set(mascota);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar el perfil de la mascota.');
      },
    });
  }
}

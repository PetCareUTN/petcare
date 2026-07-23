import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { VeterinarioResponse } from '../../models/veterinario';
import { VeterinariosService } from '../../services/veterinarios-service';
import { NotificationBellComponent } from '../../../notificaciones/components/notification-bell/notification-bell';

@Component({
  selector: 'app-estado-validacion',
  imports: [RouterLink, DatePipe, NotificationBellComponent],
  templateUrl: './estado-validacion.html',
  styleUrl: './estado-validacion.css',
})
export class EstadoValidacionPage implements OnInit {
  private readonly veterinariosService = inject(VeterinariosService);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly solicitud = signal<VeterinarioResponse | null>(null);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.veterinariosService.miEstado().subscribe({
      next: (solicitud) => {
        this.solicitud.set(solicitud);
        this.isLoading.set(false);
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }

  protected getEstadoClass(estado: string): string {
    switch (estado) {
      case 'APROBADO':
        return 'estado-aprobado';
      case 'RECHAZADO':
        return 'estado-rechazado';
      default:
        return 'estado-pendiente';
    }
  }
}

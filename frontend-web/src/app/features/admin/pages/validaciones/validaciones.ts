import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { SolicitudPendiente } from '../../../veterinarios/models/veterinario';
import { VeterinariosService } from '../../../veterinarios/services/veterinarios-service';
import { NotificationBellComponent } from '../../../notificaciones/components/notification-bell/notification-bell';

@Component({
  selector: 'app-validaciones-admin',
  imports: [RouterLink, DatePipe, NotificationBellComponent],
  templateUrl: './validaciones.html',
  styleUrl: './validaciones.css',
})
export class ValidacionesAdminPage implements OnInit {
  private readonly veterinariosService = inject(VeterinariosService);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly solicitudes = signal<SolicitudPendiente[]>([]);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    this.veterinariosService.pendientes().subscribe({
      next: (solicitudes) => {
        this.solicitudes.set(solicitudes);
        this.isLoading.set(false);
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }
}

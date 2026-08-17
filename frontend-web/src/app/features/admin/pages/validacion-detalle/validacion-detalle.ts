import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { SolicitudDetalle } from '../../../veterinarios/models/veterinario';
import { VeterinariosService } from '../../../veterinarios/services/veterinarios-service';
import { NotificationBellComponent } from '../../../notificaciones/components/notification-bell/notification-bell';

@Component({
  selector: 'app-validacion-detalle',
  imports: [RouterLink, DatePipe, NotificationBellComponent],
  templateUrl: './validacion-detalle.html',
  styleUrl: './validacion-detalle.css',
})
export class ValidacionDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly veterinariosService = inject(VeterinariosService);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly isProcessing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly solicitud = signal<SolicitudDetalle | null>(null);
  protected readonly motivoRechazo = signal('');

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.router.navigateByUrl('/admin/validaciones');
      return;
    }

    this.veterinariosService.detalle(id).subscribe({
      next: (detalle) => {
        this.solicitud.set(detalle);
        this.isLoading.set(false);
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }

  onAprobar(): void {
    const sol = this.solicitud();
    if (!sol) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    this.veterinariosService.aprobar(sol.idVeterinario).subscribe({
      next: () => {
        this.successMessage.set('Veterinario aprobado correctamente.');
        this.isProcessing.set(false);
        setTimeout(() => this.router.navigateByUrl('/admin/validaciones'), 1500);
      },
      error: (error: ApiError) => {
        this.isProcessing.set(false);
        this.errorMessage.set(error.mensaje);
      },
    });
  }

  onRechazar(): void {
    const sol = this.solicitud();
    if (!sol) return;

    if (!this.motivoRechazo()) {
      this.errorMessage.set('Debés ingresar un motivo de rechazo.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    this.veterinariosService.rechazar(sol.idVeterinario, this.motivoRechazo()).subscribe({
      next: () => {
        this.successMessage.set('Solicitud rechazada.');
        this.isProcessing.set(false);
        setTimeout(() => this.router.navigateByUrl('/admin/validaciones'), 1500);
      },
      error: (error: ApiError) => {
        this.isProcessing.set(false);
        this.errorMessage.set(error.mensaje);
      },
    });
  }

  onMotivoChange(value: string): void {
    this.motivoRechazo.set(value);
  }
}

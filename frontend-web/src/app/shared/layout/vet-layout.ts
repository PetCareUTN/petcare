import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth-service';
import { NotificationBellComponent } from '../../features/notificaciones/components/notification-bell/notification-bell';

@Component({
  selector: 'vet-layout',
  imports: [RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './vet-layout.html',
  styleUrl: './vet-layout.css',
})
export class VetLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isAttentionActive = () =>
    this.currentUrl().startsWith('/eventos-clinicos') &&
    !this.isDisponibilidadActive() &&
    !this.isTurnosActive();

  protected readonly isDisponibilidadActive = () =>
    this.currentUrl().startsWith('/eventos-clinicos/disponibilidad');

  protected readonly isTurnosActive = () =>
    this.currentUrl().startsWith('/eventos-clinicos/turnos');

  protected readonly isServiciosActive = () => this.currentUrl().startsWith('/servicios');

  logout(): void {
    this.authService.clearToken();
    this.router.navigateByUrl('/login');
  }
}

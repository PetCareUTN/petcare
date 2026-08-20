import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth-service';

@Component({
  selector: 'admin-layout',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
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

  protected readonly isUsuariosActive = () =>
    this.currentUrl().startsWith('/admin/usuarios');

  protected readonly isValidacionesActive = () =>
    this.currentUrl().startsWith('/admin/validaciones');

  logout(): void {
    this.authService.clearToken();
    this.router.navigateByUrl('/login');
  }
}

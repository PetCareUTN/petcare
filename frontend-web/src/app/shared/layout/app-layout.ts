import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth-service';
import { NotificationBellComponent } from '../../features/notificaciones/components/notification-bell/notification-bell';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, NotificationBellComponent],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.authService.clearToken();
    this.router.navigateByUrl('/login');
  }
}

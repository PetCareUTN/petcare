import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomePage {
  constructor() {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.isVeterinario()) {
      router.navigateByUrl('/eventos-clinicos');
    } else if (authService.isAdmin()) {
      router.navigateByUrl('/admin');
    }
  }
}

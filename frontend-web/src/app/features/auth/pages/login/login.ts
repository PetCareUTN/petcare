import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ApiError } from '../../models/user';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: '../../auth.css',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.authService.saveToken(response.token);
        this.authService.saveRole(response.usuario.id_rol);
        this.router.navigateByUrl(
          this.authService.isVeterinario() ? '/eventos-clinicos' : '/',
        );
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al iniciar sesión.');
      },
    });
  }
}

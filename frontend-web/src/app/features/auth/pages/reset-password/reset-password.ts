import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ApiError } from '../../models/user';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: '../../auth.css',
})
export class ResetPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly email = signal('');

  protected readonly form = this.formBuilder.group(
    {
      codigo: ['', [Validators.required, Validators.maxLength(250)]],
      nuevaContrasena: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(250)],
      ],
      confirmarContrasena: ['', [Validators.required, Validators.maxLength(250)]],
    },
    { validators: this.passwordMatchValidator },
  );

  constructor() {
    this.route.queryParams.subscribe((params) => {
      this.email.set(params['email'] ?? '');
    });
  }

  passwordMatchValidator(form: any): { [key: string]: boolean } | null {
    const nuevaContrasena = form.get('nuevaContrasena')?.value;
    const confirmarContrasena = form.get('confirmarContrasena')?.value;
    if (nuevaContrasena && confirmarContrasena && nuevaContrasena !== confirmarContrasena) {
      return { passwordMismatch: true };
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const { codigo, nuevaContrasena } = this.form.getRawValue();

    this.authService
      .resetPassword({
        email: this.email(),
        codigo: codigo!,
        nuevaContraseña: nuevaContrasena!,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.successMessage.set(response.mensaje ?? 'Contraseña restablecida correctamente.');
          setTimeout(() => {
            this.router.navigateByUrl('/login');
          }, 2000);
        },
        error: (error: ApiError) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al restablecer la contraseña.');
        },
      });
  }
}

import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ApiError, RoleName } from '../../models/user';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordsMismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: '../../auth.css',
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  private readonly defaultRole: RoleName = 'dueño_mascota';

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group(
    {
      nombre: ['', [Validators.required]],
      apellido: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { nombre, apellido, email, password } = this.form.getRawValue();

    this.authService
      .register({
        nombre: nombre!,
        apellido: apellido!,
        email: email!,
        password: password!,
        rol: this.defaultRole,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set('Cuenta creada con éxito. Ya podés iniciar sesión.');
          this.form.reset();
        },
        error: (error: ApiError) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al registrar la cuenta.');
        },
      });
  }
}

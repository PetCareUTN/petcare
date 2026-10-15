import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';

@Component({
  selector: 'app-alta-asistida-dueno',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './alta-asistida-dueno.html',
  styleUrl: './alta-asistida-dueno.css',
})
export class AltaAsistidaDuenoPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    apellido: ['', [Validators.maxLength(100)]],
    numeroDocumento: ['', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.maxLength(20)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: ['', [Validators.maxLength(30)]],
  });

  submit(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.isSubmitting.set(true);

    this.authService
      .createAssistedOwner({
        nombre: value.nombre.trim(),
        apellido: value.apellido.trim() || null,
        numeroDocumento: value.numeroDocumento.trim(),
        email: value.email.trim().toLowerCase(),
        telefono: value.telefono.trim() || null,
      })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.successMessage.set(response.mensaje);
          this.form.reset();
        },
        error: (error: ApiError) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            error.mensaje ?? 'No se pudo crear la cuenta del dueño.',
          );
        },
      });
  }
}

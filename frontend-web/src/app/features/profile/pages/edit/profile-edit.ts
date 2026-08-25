import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { UpdateProfileRequest } from '../../models/profile';
import { ProfileService } from '../../services/profile-service';

@Component({
  selector: 'app-profile-edit',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile-edit.html',
  styleUrl: './profile-edit.css',
})
export class ProfileEditPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private static readonly NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ'\-\s]*$/;
  private static readonly TELEFONO_PATTERN = /^[0-9+\-\s()]+$/;

  protected readonly form = this.formBuilder.group({
    nombre: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(ProfileEditPage.NOMBRE_PATTERN),
      ],
    ],
    apellido: [
      '',
      [
        Validators.required,
        Validators.maxLength(100),
        Validators.pattern(ProfileEditPage.NOMBRE_PATTERN),
      ],
    ],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    telefono: [
      '',
      [Validators.maxLength(30), Validators.pattern(ProfileEditPage.TELEFONO_PATTERN)],
    ],
  });

  ngOnInit(): void {
    this.profileService.getMe().subscribe({
      next: (profile) => {
        this.isLoading.set(false);
        this.form.setValue({
          nombre: profile.nombre,
          apellido: profile.apellido,
          email: profile.email,
          telefono: profile.telefono ?? '',
        });
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar tu perfil.');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const { nombre, apellido, email, telefono } = this.form.getRawValue();
    const payload: UpdateProfileRequest = {
      nombre: nombre!,
      apellido: apellido!,
      email: email!,
      telefono: telefono || undefined,
    };

    this.profileService.update(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Perfil actualizado con éxito.');
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al actualizar tu perfil.');
      },
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { CreateMascotaRequest, PetSex } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

@Component({
  selector: 'app-create-mascota',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-mascota.html',
  styleUrl: './create-mascota.css',
})
export class CreateMascotaPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly mascotasService = inject(MascotasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);

  protected readonly form = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    especie: ['', [Validators.required, Validators.maxLength(50)]],
    raza: ['', [Validators.maxLength(80)]],
    sexo: ['macho' as PetSex, [Validators.required]],
    fechaNacimiento: [''],
    peso: [null as number | null, [Validators.min(0)]],
    esterilizado: [false],
    observaciones: [''],
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  submit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const payload: CreateMascotaRequest = {
      nombre: value.nombre!,
      especie: value.especie!,
      raza: value.raza || undefined,
      sexo: value.sexo!,
      fechaNacimiento: value.fechaNacimiento || undefined,
      peso: value.peso ?? undefined,
      esterilizado: value.esterilizado ?? false,
      observaciones: value.observaciones || undefined,
    };

    this.mascotasService.create(payload, this.selectedFile() ?? undefined).subscribe({
      next: (mascota) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Mascota ${mascota.nombre} registrada con exito.`);
        this.selectedFile.set(null);
        this.form.reset({
          nombre: '',
          especie: '',
          raza: '',
          sexo: 'macho',
          fechaNacimiento: '',
          peso: null,
          esterilizado: false,
          observaciones: '',
        });
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrio un error al registrar la mascota.');
      },
    });
  }
}

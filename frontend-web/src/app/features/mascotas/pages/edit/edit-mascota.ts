import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { PetSex, UpdateMascotaRequest } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

@Component({
  selector: 'app-edit-mascota',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './edit-mascota.html',
  styleUrl: './edit-mascota.css',
})
export class EditMascotaPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly mascotasService = inject(MascotasService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly mascotaId = signal<number | null>(null);
  protected readonly nombreMascota = signal<string>('');

  protected readonly form = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    especie: ['', [Validators.required, Validators.maxLength(50)]],
    raza: ['', [Validators.maxLength(80)]],
    sexo: ['macho' as PetSex, [Validators.required]],
    fechaNacimiento: [''],
    peso: [null as number | null, [Validators.min(0)]],
    esterilizado: [false],
    observaciones: [''],
    alergias: [''],
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.mascotaId.set(id);

    this.mascotasService.getById(id).subscribe({
      next: (mascota) => {
        this.isLoading.set(false);
        this.nombreMascota.set(mascota.nombre);
        this.form.patchValue({
          nombre: mascota.nombre,
          especie: mascota.especie,
          raza: mascota.raza ?? '',
          sexo: mascota.sexo,
          fechaNacimiento: mascota.fechaNacimiento ?? '',
          peso: mascota.peso,
          esterilizado: mascota.esterilizado,
          observaciones: mascota.observaciones ?? '',
          alergias: mascota.alergias ?? '',
        });
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar la mascota.');
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files?.[0] ?? null);
  }

  submit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const id = this.mascotaId();
    if (id === null || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const payload: UpdateMascotaRequest = {
      nombre: value.nombre!,
      especie: value.especie!,
      raza: value.raza ?? '',
      sexo: value.sexo!,
      fechaNacimiento: value.fechaNacimiento || undefined,
      peso: value.peso ?? undefined,
      esterilizado: value.esterilizado ?? false,
      observaciones: value.observaciones ?? '',
      alergias: value.alergias ?? '',
    };

    this.mascotasService.update(id, payload, this.selectedFile() ?? undefined).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/mascotas', id]);
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al guardar los cambios.');
      },
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { CreateMascotaRequest, MascotaOwner, PetSex } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

const BREED_OPTIONS_BY_SPECIES: Record<string, string[]> = {
  Perro: [
    'Mestizo',
    'Labrador Retriever',
    'Golden Retriever',
    'Caniche',
    'Bulldog Frances',
    'Pastor Aleman',
    'Beagle',
    'Boxer',
    'Chihuahua',
    'Dachshund',
    'Shih Tzu',
    'Yorkshire Terrier',
    'Otro',
  ],
  Gato: [
    'Mestizo',
    'Siames',
    'Persa',
    'Maine Coon',
    'Bengala',
    'Ragdoll',
    'Sphynx',
    'British Shorthair',
    'Angora',
    'Otro',
  ],
};

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
  protected readonly isSearchingOwner = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly ownerSearchMessage = signal<string | null>(null);
  protected readonly selectedOwner = signal<MascotaOwner | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly createdPetId = signal<number | null>(null);
  protected readonly speciesOptions = Object.keys(BREED_OPTIONS_BY_SPECIES);
  protected readonly isVeterinaryFlow = this.authService.isVeterinario();

  protected readonly ownerSearchForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

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

  protected breedOptions(): string[] {
    const species = this.form.controls.especie.value;
    return species ? (BREED_OPTIONS_BY_SPECIES[species] ?? []) : [];
  }

  protected onSpeciesChanged(): void {
    this.form.controls.raza.setValue('');
  }

  protected ownerDisplayName(owner: MascotaOwner): string {
    return [owner.nombre, owner.apellido].filter(Boolean).join(' ');
  }

  protected profileLink(petId: number): string[] {
    return this.isVeterinaryFlow
      ? ['/eventos-clinicos/mascota', String(petId)]
      : ['..', String(petId)];
  }

  protected onOwnerEmailChanged(): void {
    this.selectedOwner.set(null);
    this.ownerSearchMessage.set(null);
  }

  protected searchOwner(): void {
    if (this.ownerSearchForm.invalid) {
      this.ownerSearchForm.markAllAsTouched();
      return;
    }

    const email = this.ownerSearchForm.controls.email.value?.trim() ?? '';
    this.selectedOwner.set(null);
    this.ownerSearchMessage.set(null);
    this.errorMessage.set(null);
    this.isSearchingOwner.set(true);

    this.mascotasService.findOwnerByEmail(email).subscribe({
      next: (owner) => {
        this.isSearchingOwner.set(false);
        this.selectedOwner.set(owner);
      },
      error: (error: ApiError) => {
        this.isSearchingOwner.set(false);
        this.ownerSearchMessage.set(error.mensaje ?? 'No se encontró un dueño con ese email.');
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isVeterinaryFlow && !this.selectedOwner()) {
      this.ownerSearchForm.markAllAsTouched();
      this.ownerSearchMessage.set('Busca y selecciona el dueño antes de registrar la mascota.');
      return;
    }

    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.createdPetId.set(null);
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
      alergias: value.alergias || undefined,
    };

    const createRequest =
      this.isVeterinaryFlow && this.selectedOwner()
        ? this.mascotasService.createForOwner(
            this.selectedOwner()!.id_usuario,
            payload,
            this.selectedFile() ?? undefined,
          )
        : this.mascotasService.create(payload, this.selectedFile() ?? undefined);

    createRequest.subscribe({
      next: (mascota) => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Mascota ${mascota.nombre} registrada con exito.`);
        this.selectedFile.set(null);
        this.createdPetId.set(mascota.idMascota);
        this.form.reset({
          nombre: '',
          especie: '',
          raza: '',
          sexo: 'macho',
          fechaNacimiento: '',
          peso: null,
          esterilizado: false,
          observaciones: '',
          alergias: '',
        });
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrio un error al registrar la mascota.');
      },
    });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { CreateMascotaRequest, MascotaOwner, PetSex } from '../../models/mascota';
import { MascotasService } from '../../services/mascotas-service';

type OwnerSearchMode = 'documento' | 'email';

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
  imports: [ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './create-mascota.html',
  styleUrl: './create-mascota.css',
})
export class CreateMascotaPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly mascotasService = inject(MascotasService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly isSubmitting = signal(false);
  protected readonly isSearchingOwner = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly ownerSearchMessage = signal<string | null>(null);
  protected readonly selectedOwner = signal<MascotaOwner | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly createdPetId = signal<number | null>(null);
  protected readonly ownerSearchMode = signal<OwnerSearchMode>('documento');
  protected readonly backQueryParams = signal<Record<string, string | number>>({});
  protected readonly speciesOptions = Object.keys(BREED_OPTIONS_BY_SPECIES);
  protected readonly isVeterinaryFlow = this.authService.isVeterinario();

  protected readonly ownerSearchForm = this.formBuilder.group({
    documento: ['', [Validators.pattern(/^[0-9]*$/), Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(150)]],
  });

  protected readonly form = this.formBuilder.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    especie: ['', [Validators.required, Validators.maxLength(50)]],
    raza: ['', [Validators.maxLength(80)]],
    razaPersonalizada: ['', [Validators.maxLength(80)]],
    sexo: ['macho' as PetSex, [Validators.required]],
    fechaNacimiento: [''],
    peso: [null as number | null, [Validators.min(0)]],
    esterilizado: [false],
    observaciones: [''],
    alergias: [''],
  });

  ngOnInit(): void {
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument');
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail');

    if (ownerDocument) {
      this.ownerSearchMode.set('documento');
      this.ownerSearchForm.patchValue({ documento: ownerDocument });
    } else if (ownerEmail) {
      this.ownerSearchMode.set('email');
      this.ownerSearchForm.patchValue({ email: ownerEmail });
    }

    this.backQueryParams.set(this.buildBackQueryParams());

    if (this.isVeterinaryFlow && (ownerDocument || ownerEmail)) {
      this.searchOwner();
    }
  }

  protected breedOptions(): string[] {
    const species = this.form.controls.especie.value;
    return species ? (BREED_OPTIONS_BY_SPECIES[species] ?? []) : [];
  }

  protected isCustomBreed(): boolean {
    return this.form.controls.raza.value === 'Otro';
  }

  protected onSpeciesChanged(): void {
    this.form.controls.raza.setValue('');
    this.form.controls.razaPersonalizada.setValue('');
  }

  protected onBreedChanged(): void {
    if (!this.isCustomBreed()) {
      this.form.controls.razaPersonalizada.setValue('');
    }
  }

  protected ownerDisplayName(owner: MascotaOwner): string {
    return [owner.nombre, owner.apellido].filter(Boolean).join(' ');
  }

  protected profileLink(petId: number): string[] {
    return this.isVeterinaryFlow
      ? ['/eventos-clinicos/mascota', String(petId)]
      : ['..', String(petId)];
  }

  protected setOwnerSearchMode(mode: OwnerSearchMode): void {
    this.ownerSearchMode.set(mode);
    this.selectedOwner.set(null);
    this.ownerSearchMessage.set(null);
    if (mode === 'documento') {
      this.ownerSearchForm.patchValue({ email: '' });
      return;
    }
    this.ownerSearchForm.patchValue({ documento: '' });
  }

  protected onOwnerSearchChanged(): void {
    this.selectedOwner.set(null);
    this.ownerSearchMessage.set(null);
  }

  protected searchOwner(): void {
    const mode = this.ownerSearchMode();
    const documento =
      mode === 'documento' ? (this.ownerSearchForm.controls.documento.value?.trim() ?? '') : '';
    const email =
      mode === 'email'
        ? (this.ownerSearchForm.controls.email.value?.trim().toLowerCase() ?? '')
        : '';

    if (this.ownerSearchForm.invalid) {
      this.ownerSearchForm.markAllAsTouched();
      this.ownerSearchMessage.set('Revisá el dato ingresado para buscar al dueño.');
      return;
    }

    if (mode === 'documento' && !documento) {
      this.ownerSearchForm.markAllAsTouched();
      this.ownerSearchMessage.set('Ingresá el DNI para buscar al dueño.');
      return;
    }

    if (mode === 'email' && !email) {
      this.ownerSearchForm.markAllAsTouched();
      this.ownerSearchMessage.set('Ingresá el email para buscar al dueño.');
      return;
    }

    this.selectedOwner.set(null);
    this.ownerSearchMessage.set(null);
    this.errorMessage.set(null);
    this.isSearchingOwner.set(true);

    this.mascotasService
      .findOwner({ documento: documento || undefined, email: email || undefined })
      .subscribe({
        next: (owner) => {
          this.isSearchingOwner.set(false);
          this.selectedOwner.set(owner);
          this.backQueryParams.set(this.buildBackQueryParams());
        },
        error: (error: ApiError) => {
          this.isSearchingOwner.set(false);
          this.ownerSearchMessage.set(error.mensaje ?? 'No se encontró un dueño con esos datos.');
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

    if (this.isCustomBreed() && !this.form.controls.razaPersonalizada.value?.trim()) {
      this.form.controls.razaPersonalizada.markAsTouched();
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
    const raza = value.raza === 'Otro' ? value.razaPersonalizada?.trim() : value.raza;
    const payload: CreateMascotaRequest = {
      nombre: value.nombre!,
      especie: value.especie!,
      raza: raza || undefined,
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
          razaPersonalizada: '',
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

  protected backLink(): string[] {
    return this.isVeterinaryFlow ? ['/eventos-clinicos'] : ['..'];
  }

  protected profileQueryParams(petId: number): Record<string, string | number> {
    if (!this.isVeterinaryFlow) {
      return {};
    }

    return {
      ...this.buildBackQueryParams(),
      selectedPetId: petId,
    };
  }

  private buildBackQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const ownerDocument =
      this.selectedOwner()?.numero_documento ??
      this.route.snapshot.queryParamMap.get('ownerDocument');
    const ownerEmail =
      this.selectedOwner()?.email ?? this.route.snapshot.queryParamMap.get('ownerEmail');
    const selectedPetId = this.route.snapshot.queryParamMap.get('selectedPetId');

    if (ownerDocument) {
      params['ownerDocument'] = ownerDocument;
    } else if (ownerEmail) {
      params['ownerEmail'] = ownerEmail;
    }

    if (selectedPetId) {
      params['selectedPetId'] = selectedPetId;
    }

    return params;
  }
}

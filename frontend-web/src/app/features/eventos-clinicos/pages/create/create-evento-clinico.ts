import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { MascotasService } from '../../../mascotas/services/mascotas-service';
import {
  ArchivoMedicoResponse,
  ClinicalEventType,
  CreateEventoClinicoRequest,
  TipoVacuna,
} from '../../models/evento-clinico';
import { EventosClinicosService } from '../../services/eventos-clinicos-service';

type EventTypeOption = {
  value: ClinicalEventType;
  label: string;
};

type VacunaOption = {
  value: TipoVacuna;
  label: string;
  especie: string;
};

/**
 * Límites de caracteres visibles (sin contar el markup HTML del editor) para
 * los campos de texto libre del evento clínico. La descripción es la
 * narrativa principal de la consulta, por eso tiene más margen; los otros
 * tres suelen ser más acotados en la práctica.
 */
const DESCRIPCION_MAX_LENGTH = 1000;
const CAMPO_CORTO_MAX_LENGTH = 500;

@Component({
  selector: 'app-create-evento-clinico',
  imports: [ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './create-evento-clinico.html',
  styleUrl: './create-evento-clinico.css',
})
export class CreateEventoClinicoPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventosClinicosService = inject(EventosClinicosService);
  private readonly mascotasService = inject(MascotasService);
  protected readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly eventTypes: EventTypeOption[] = [
    { value: 'consulta', label: 'Consulta' },
    { value: 'vacuna', label: 'Vacuna' },
    { value: 'diagnostico', label: 'Diagnostico' },
    { value: 'tratamiento', label: 'Tratamiento' },
    { value: 'cirugia', label: 'Cirugia' },
    { value: 'control', label: 'Control' },
    { value: 'observacion', label: 'Observacion' },
    { value: 'otro', label: 'Otro' },
  ];

  /**
   * Se muestran todas las vacunas, con la especie como referencia visual: el
   * formulario recibe el id de la mascota pero no su especie, y traerla solo
   * para filtrar esta lista no justifica el pedido extra. El veterinario sabe
   * cuál corresponde.
   */
  protected readonly vacunas: VacunaOption[] = [
    { value: 'antirrabica', label: 'Antirrabica', especie: 'perros y gatos' },
    { value: 'quintuple', label: 'Quintuple', especie: 'perros' },
    { value: 'sextuple', label: 'Sextuple', especie: 'perros' },
    { value: 'traqueobronquitis', label: 'Traqueobronquitis', especie: 'perros' },
    { value: 'triple_felina', label: 'Triple felina', especie: 'gatos' },
    { value: 'leucemia_felina', label: 'Leucemia felina', especie: 'gatos' },
  ];

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createdEventId = signal<number | null>(null);
  protected readonly archivosSubidos = signal<ArchivoMedicoResponse[]>([]);
  protected readonly uploadingArchivos = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly backQueryParams = signal<Record<string, string | number>>({});
  protected readonly mascotaNombre = signal<string | null>(null);
  protected readonly isLoadingMascota = signal(false);

  protected readonly descripcionMaxLength = DESCRIPCION_MAX_LENGTH;
  protected readonly campoCortoMaxLength = CAMPO_CORTO_MAX_LENGTH;

  protected readonly form = this.formBuilder.group({
    idMascota: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo: ['consulta' as ClinicalEventType, [Validators.required]],
    fecha: [this.today(), [Validators.required]],
    descripcion: ['', [Validators.required]],
    diagnostico: [''],
    tratamiento: [''],
    observaciones: [''],
    vacuna: [null as TipoVacuna | null],
    proximaAplicacion: [''],
  });

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/login');
      return;
    }

    const idMascota = Number(
      this.route.snapshot.queryParamMap.get('idMascota') ??
        this.route.snapshot.queryParamMap.get('selectedPetId'),
    );
    if (Number.isInteger(idMascota) && idMascota > 0) {
      this.form.patchValue({ idMascota });
      this.cargarNombreMascota(idMascota);
    }

    this.backQueryParams.set(this.buildBackQueryParams());

    // Los campos de vacunación solo existen —y solo son obligatorios— cuando el
    // evento es una vacuna. Se enganchan y desenganchan al cambiar el tipo para
    // que el formulario no quede inválido por campos que ni se muestran.
    this.form.controls.tipo.valueChanges.subscribe((tipo) => {
      this.aplicarValidacionDeVacuna(tipo === 'vacuna');
    });
    this.aplicarValidacionDeVacuna(this.form.controls.tipo.value === 'vacuna');
  }

  private aplicarValidacionDeVacuna(esVacuna: boolean): void {
    const { vacuna, proximaAplicacion } = this.form.controls;
    if (esVacuna) {
      vacuna.addValidators(Validators.required);
      proximaAplicacion.addValidators(Validators.required);
    } else {
      vacuna.removeValidators(Validators.required);
      proximaAplicacion.removeValidators(Validators.required);
      vacuna.setValue(null);
      proximaAplicacion.setValue('');
    }
    vacuna.updateValueAndValidity();
    proximaAplicacion.updateValueAndValidity();
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
    this.createdEventId.set(null);
    this.archivosSubidos.set([]);
    this.uploadError.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const payload: CreateEventoClinicoRequest = {
      idMascota: Number(value.idMascota),
      tipo: value.tipo!,
      fecha: value.fecha!,
      descripcion: value.descripcion!.trim(),
      diagnostico: this.optionalText(value.diagnostico),
      tratamiento: this.optionalText(value.tratamiento),
      observaciones: this.optionalText(value.observaciones),
    };

    if (value.tipo === 'vacuna') {
      payload.vacuna = value.vacuna!;
      payload.proximaAplicacion = value.proximaAplicacion!;
    }

    this.eventosClinicosService.create(payload).subscribe({
      next: (evento) => {
        this.isSubmitting.set(false);
        this.createdEventId.set(evento.idEvento);
        this.archivosSubidos.set(evento.archivos);
        this.successMessage.set(
          `Evento clinico registrado en la historia #${evento.idHistoria}.`,
        );
        this.form.reset({
          idMascota: evento.idMascota,
          tipo: 'consulta',
          fecha: this.today(),
          descripcion: '',
          diagnostico: '',
          tratamiento: '',
          observaciones: '',
          vacuna: null,
          proximaAplicacion: '',
        });
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrio un error al registrar el evento.');
      },
    });
  }

  protected resolveArchivoUrl(url: string): string {
    return this.eventosClinicosService.resolveArchivoUrl(url);
  }

  protected subirArchivos(input: HTMLInputElement): void {
    const idEvento = this.createdEventId();
    if (idEvento === null) {
      return;
    }

    const archivos = input.files ? Array.from(input.files) : [];
    if (archivos.length === 0) {
      return;
    }

    this.uploadingArchivos.set(true);
    this.uploadError.set(null);

    this.eventosClinicosService.agregarArchivos(idEvento, archivos).subscribe({
      next: (nuevosArchivos) => {
        this.uploadingArchivos.set(false);
        input.value = '';
        this.archivosSubidos.update((actuales) => [...actuales, ...nuevosArchivos]);
      },
      error: (error: ApiError) => {
        this.uploadingArchivos.set(false);
        input.value = '';
        this.uploadError.set(error.mensaje ?? 'No se pudo adjuntar el archivo.');
      },
    });
  }

  protected esVacuna(): boolean {
    return this.form.controls.tipo.value === 'vacuna';
  }

  protected mascotaDisplayText(): string {
    if (this.isLoadingMascota()) {
      return 'Cargando...';
    }
    const nombre = this.mascotaNombre();
    if (nombre) {
      return nombre;
    }
    const idMascota = this.form.controls.idMascota.value;
    return idMascota ? `Mascota #${idMascota}` : 'Sin mascota seleccionada';
  }

  private optionalText(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private cargarNombreMascota(idMascota: number): void {
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument') ?? undefined;
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail') ?? undefined;

    this.isLoadingMascota.set(true);
    this.mascotasService.getById(idMascota, { ownerDocument, ownerEmail }).subscribe({
      next: (mascota) => {
        this.isLoadingMascota.set(false);
        this.mascotaNombre.set(mascota.nombre);
      },
      error: () => {
        this.isLoadingMascota.set(false);
        this.mascotaNombre.set(null);
      },
    });
  }

  private buildBackQueryParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument');
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail');
    const selectedPetId = this.route.snapshot.queryParamMap.get('selectedPetId');
    const idMascota = this.route.snapshot.queryParamMap.get('idMascota');

    if (ownerDocument) {
      params['ownerDocument'] = ownerDocument;
    } else if (ownerEmail) {
      params['ownerEmail'] = ownerEmail;
    }

    if (selectedPetId) {
      params['selectedPetId'] = selectedPetId;
    } else if (idMascota) {
      params['selectedPetId'] = idMascota;
    }

    return params;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

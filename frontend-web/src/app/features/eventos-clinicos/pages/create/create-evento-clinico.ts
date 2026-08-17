import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { RichTextEditorComponent } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import {
  ArchivoMedicoResponse,
  ClinicalEventType,
  CreateEventoClinicoRequest,
} from '../../models/evento-clinico';
import { EventosClinicosService } from '../../services/eventos-clinicos-service';

type EventTypeOption = {
  value: ClinicalEventType;
  label: string;
};

@Component({
  selector: 'app-create-evento-clinico',
  imports: [ReactiveFormsModule, RouterLink, RichTextEditorComponent],
  templateUrl: './create-evento-clinico.html',
  styleUrl: './create-evento-clinico.css',
})
export class CreateEventoClinicoPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventosClinicosService = inject(EventosClinicosService);
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

  protected readonly isSubmitting = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly createdEventId = signal<number | null>(null);
  protected readonly archivosSubidos = signal<ArchivoMedicoResponse[]>([]);
  protected readonly uploadingArchivos = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly backQueryParams = signal<Record<string, string | number>>({});

  protected readonly form = this.formBuilder.group({
    idMascota: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo: ['consulta' as ClinicalEventType, [Validators.required]],
    fecha: [this.today(), [Validators.required]],
    descripcion: ['', [Validators.required, Validators.maxLength(2000)]],
    diagnostico: ['', [Validators.maxLength(2000)]],
    tratamiento: ['', [Validators.maxLength(2000)]],
    observaciones: ['', [Validators.maxLength(2000)]],
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
    }

    this.backQueryParams.set(this.buildBackQueryParams());
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

  private optionalText(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
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

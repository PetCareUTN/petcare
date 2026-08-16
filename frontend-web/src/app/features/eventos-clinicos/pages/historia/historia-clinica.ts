import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { MascotaResponse } from '../../../mascotas/models/mascota';
import { MascotasService } from '../../../mascotas/services/mascotas-service';
import {
  ClinicalEventType,
  CreateEventoClinicoRequest,
  EventoClinicoResponse,
} from '../../models/evento-clinico';
import { EventosClinicosService } from '../../services/eventos-clinicos-service';

type EventTypeOption = {
  value: ClinicalEventType;
  label: string;
};

const EVENT_TYPE_LABELS: Record<ClinicalEventType, string> = {
  consulta: 'Consulta',
  diagnostico: 'Diagnóstico',
  tratamiento: 'Tratamiento',
  cirugia: 'Cirugía',
  control: 'Control',
  observacion: 'Observación',
  otro: 'Otro',
};

@Component({
  selector: 'app-historia-clinica',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.css',
})
export class HistoriaClinicaPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventosClinicosService = inject(EventosClinicosService);
  protected readonly mascotasService = inject(MascotasService);
  protected readonly authService = inject(AuthService);

  protected readonly eventTypes: EventTypeOption[] = [
    { value: 'consulta', label: 'Consulta' },
    { value: 'diagnostico', label: 'Diagnostico' },
    { value: 'tratamiento', label: 'Tratamiento' },
    { value: 'cirugia', label: 'Cirugia' },
    { value: 'control', label: 'Control' },
    { value: 'observacion', label: 'Observacion' },
    { value: 'otro', label: 'Otro' },
  ];

  protected readonly idMascota = signal<number | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly eventos = signal<EventoClinicoResponse[]>([]);
  protected readonly mascota = signal<MascotaResponse | null>(null);
  protected readonly backQueryParams = signal<Record<string, string | number>>({});

  protected readonly isFormOpen = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  protected readonly uploadingEventoId = signal<number | null>(null);
  protected readonly uploadErrors = signal<Record<number, string>>({});

  protected readonly form = this.formBuilder.group({
    tipo: ['consulta' as ClinicalEventType, [Validators.required]],
    fecha: [this.today(), [Validators.required]],
    descripcion: ['', [Validators.required, Validators.maxLength(2000)]],
    diagnostico: ['', [Validators.maxLength(2000)]],
    tratamiento: ['', [Validators.maxLength(2000)]],
    observaciones: ['', [Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    const idMascota = Number(this.route.snapshot.paramMap.get('idMascota'));
    this.idMascota.set(idMascota);
    this.backQueryParams.set(this.buildBackQueryParams(idMascota));
    this.cargarHistoria(idMascota);
  }

  protected reintentar(): void {
    const idMascota = this.idMascota();
    if (idMascota !== null) {
      this.cargarHistoria(idMascota);
    }
  }

  protected etiquetaTipo(tipo: ClinicalEventType): string {
    return EVENT_TYPE_LABELS[tipo] ?? tipo;
  }

  protected abrirFormulario(): void {
    this.submitError.set(null);
    this.isFormOpen.set(true);
  }

  protected cerrarFormulario(): void {
    this.isFormOpen.set(false);
    this.submitError.set(null);
    this.form.reset({
      tipo: 'consulta',
      fecha: this.today(),
      descripcion: '',
      diagnostico: '',
      tratamiento: '',
      observaciones: '',
    });
  }

  protected registrarConsulta(): void {
    const idMascota = this.idMascota();
    if (idMascota === null) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitError.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const payload: CreateEventoClinicoRequest = {
      idMascota,
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
        this.eventos.update((eventos) => [...eventos, evento]);
        this.cerrarFormulario();
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.submitError.set(error.mensaje ?? 'Ocurrio un error al registrar el evento.');
      },
    });
  }

  protected resolveArchivoUrl(url: string): string {
    return this.eventosClinicosService.resolveArchivoUrl(url);
  }

  protected subirArchivos(idEvento: number, input: HTMLInputElement): void {
    const archivos = input.files ? Array.from(input.files) : [];
    if (archivos.length === 0) {
      return;
    }

    this.uploadingEventoId.set(idEvento);
    this.uploadErrors.update((errors) => {
      const { [idEvento]: _omit, ...rest } = errors;
      return rest;
    });

    this.eventosClinicosService.agregarArchivos(idEvento, archivos).subscribe({
      next: (nuevosArchivos) => {
        this.uploadingEventoId.set(null);
        input.value = '';
        this.eventos.update((eventos) =>
          eventos.map((evento) =>
            evento.idEvento === idEvento
              ? { ...evento, archivos: [...evento.archivos, ...nuevosArchivos] }
              : evento,
          ),
        );
      },
      error: (error: ApiError) => {
        this.uploadingEventoId.set(null);
        input.value = '';
        this.uploadErrors.update((errors) => ({
          ...errors,
          [idEvento]: error.mensaje ?? 'No se pudo adjuntar el archivo.',
        }));
      },
    });
  }

  private cargarHistoria(idMascota: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const attentionContext = this.attentionContext();

    forkJoin({
      historia: this.eventosClinicosService.getByMascota(idMascota, attentionContext),
      mascota: this.mascotasService.getById(idMascota, attentionContext),
    }).subscribe({
      next: ({ historia, mascota }) => {
        this.isLoading.set(false);
        this.eventos.set(historia.eventos);
        this.mascota.set(mascota);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          error.mensaje ?? 'No se pudo cargar la historia clínica.',
        );
      },
    });
  }

  private optionalText(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private attentionContext(): { ownerDocument?: string; ownerEmail?: string } {
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument') ?? undefined;
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail') ?? undefined;

    return {
      ...(ownerDocument ? { ownerDocument } : {}),
      ...(ownerEmail ? { ownerEmail } : {}),
    };
  }

  private buildBackQueryParams(idMascota: number): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    const ownerDocument = this.route.snapshot.queryParamMap.get('ownerDocument');
    const ownerEmail = this.route.snapshot.queryParamMap.get('ownerEmail');
    const selectedPetId = this.route.snapshot.queryParamMap.get('selectedPetId');

    if (ownerDocument) {
      params['ownerDocument'] = ownerDocument;
    } else if (ownerEmail) {
      params['ownerEmail'] = ownerEmail;
    }

    params['selectedPetId'] = selectedPetId ?? idMascota;

    return params;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

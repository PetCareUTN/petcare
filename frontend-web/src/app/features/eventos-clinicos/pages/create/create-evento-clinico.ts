import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import {
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
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-evento-clinico.html',
  styleUrl: './create-evento-clinico.css',
})
export class CreateEventoClinicoPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventosClinicosService = inject(EventosClinicosService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly eventTypes: EventTypeOption[] = [
    { value: 'consulta', label: 'Consulta' },
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

    const idMascota = Number(this.route.snapshot.queryParamMap.get('idMascota'));
    if (Number.isInteger(idMascota) && idMascota > 0) {
      this.form.patchValue({ idMascota });
    }
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

  private optionalText(value: string | null | undefined): string | undefined {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

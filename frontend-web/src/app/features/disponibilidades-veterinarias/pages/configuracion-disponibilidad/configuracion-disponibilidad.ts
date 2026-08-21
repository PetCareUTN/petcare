import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import {
  DiaSemana,
  DisponibilidadVeterinariaRequest,
} from '../../models/disponibilidad-veterinaria';
import { DisponibilidadesVeterinariasService } from '../../services/disponibilidades-veterinarias-service';

type DiaOption = { value: DiaSemana; label: string };

@Component({
  selector: 'app-configuracion-disponibilidad',
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion-disponibilidad.html',
  styleUrl: './configuracion-disponibilidad.css',
})
export class ConfiguracionDisponibilidadPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly disponibilidadesService = inject(DisponibilidadesVeterinariasService);

  protected readonly dias: DiaOption[] = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' },
  ];

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    disponibilidades: this.formBuilder.array([this.buildDisponibilidadGroup()]),
  });

  ngOnInit(): void {
    this.disponibilidadesService.getMine().subscribe({
      next: (disponibilidades) => {
        this.isLoading.set(false);
        this.disponibilidades.clear();

        if (disponibilidades.length === 0) {
          this.disponibilidades.push(this.buildDisponibilidadGroup());
          return;
        }

        disponibilidades.forEach((disponibilidad) => {
          this.disponibilidades.push(
            this.buildDisponibilidadGroup({
              diaSemana: disponibilidad.diaSemana,
              horaInicio: disponibilidad.horaInicio.slice(0, 5),
              horaFin: disponibilidad.horaFin.slice(0, 5),
            }),
          );
        });
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar la disponibilidad.');
      },
    });
  }

  protected get disponibilidades(): FormArray {
    return this.form.controls.disponibilidades;
  }

  protected agregarFranja(): void {
    this.disponibilidades.push(this.buildDisponibilidadGroup());
  }

  protected quitarFranja(index: number): void {
    if (this.disponibilidades.length > 1) {
      this.disponibilidades.removeAt(index);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completá el día y los horarios de todas las franjas antes de guardar.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const payload = {
      disponibilidades: this.form.getRawValue()
        .disponibilidades as DisponibilidadVeterinariaRequest[],
    };

    this.disponibilidadesService.replaceMine(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Disponibilidad guardada correctamente.');
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo guardar la disponibilidad.');
      },
    });
  }

  private buildDisponibilidadGroup(
    value: DisponibilidadVeterinariaRequest = {
      diaSemana: 'lunes',
      horaInicio: '',
      horaFin: '',
    },
  ) {
    return this.formBuilder.group({
      diaSemana: [value.diaSemana, [Validators.required]],
      horaInicio: [value.horaInicio, [Validators.required]],
      horaFin: [value.horaFin, [Validators.required]],
    });
  }
}

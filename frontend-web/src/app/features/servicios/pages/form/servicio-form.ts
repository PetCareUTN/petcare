import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { CategoriaServicio, DiaSemana } from '../../models/servicio';
import { ServiciosService } from '../../services/servicios-service';

type CategoriaOption = { value: CategoriaServicio; label: string };
type DiaOption = { value: DiaSemana; label: string };

@Component({
  selector: 'app-servicio-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './servicio-form.html',
  styleUrl: './servicio-form.css',
})
export class ServicioFormPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly serviciosService = inject(ServiciosService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly categorias: CategoriaOption[] = [
    { value: 'paseador', label: 'Paseador' },
    { value: 'guarderia', label: 'Guardería' },
    { value: 'peluqueria', label: 'Peluquería' },
  ];

  protected readonly dias: DiaOption[] = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
    { value: 'domingo', label: 'Domingo' },
  ];

  protected readonly idServicio = signal<number | null>(null);
  protected readonly isEditMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.group({
    categoria: ['paseador' as CategoriaServicio, [Validators.required]],
    descripcion: ['', [Validators.maxLength(250)]],
    disponibilidades: this.formBuilder.array(
      [this.buildDisponibilidadGroup()],
      [Validators.required, Validators.minLength(1)],
    ),
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      return;
    }

    const id = Number(idParam);
    this.idServicio.set(id);
    this.isEditMode.set(true);
    this.isLoading.set(true);

    this.serviciosService.getOne(id).subscribe({
      next: (servicio) => {
        this.isLoading.set(false);
        this.disponibilidades.clear();
        servicio.disponibilidades.forEach((disponibilidad) => {
          this.disponibilidades.push(
            this.buildDisponibilidadGroup({
              diaSemana: disponibilidad.diaSemana,
              horaInicio: disponibilidad.horaInicio.slice(0, 5),
              horaFin: disponibilidad.horaFin.slice(0, 5),
            }),
          );
        });
        this.form.patchValue({
          categoria: servicio.categoria,
          descripcion: servicio.descripcion ?? '',
        });
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar el servicio.');
      },
    });
  }

  protected get disponibilidades(): FormArray {
    return this.form.controls.disponibilidades;
  }

  protected agregarDisponibilidad(): void {
    this.disponibilidades.push(this.buildDisponibilidadGroup());
  }

  protected quitarDisponibilidad(index: number): void {
    if (this.disponibilidades.length > 1) {
      this.disponibilidades.removeAt(index);
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isSubmitting.set(true);

    const value = this.form.getRawValue();
    const payload = {
      categoria: value.categoria!,
      descripcion: value.descripcion?.trim() || undefined,
      disponibilidades: value.disponibilidades as {
        diaSemana: DiaSemana;
        horaInicio: string;
        horaFin: string;
      }[],
    };

    const id = this.idServicio();
    const request = id
      ? this.serviciosService.update(id, payload)
      : this.serviciosService.create(payload);

    request.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigateByUrl('/servicios');
      },
      error: (error: ApiError) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(error.mensaje ?? 'Ocurrió un error al guardar el servicio.');
      },
    });
  }

  private buildDisponibilidadGroup(
    value: { diaSemana: DiaSemana; horaInicio: string; horaFin: string } = {
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

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { CategoriaServicio, DiaSemana, DisponibilidadRequest } from '../../models/servicio';
import { ServiciosService } from '../../services/servicios-service';

type CategoriaOption = { value: CategoriaServicio; label: string };
type DiaOption = { value: DiaSemana; label: string; corto: string };

/** Una franja horaria que se ofrece uno o varios días (ej. Lun a Vie, 09:00 a 18:00). */
interface ReglaHorario {
  /** Id local, solo para trackear la fila en la UI hasta guardar. */
  id: number;
  dias: DiaSemana[];
  horaInicio: string;
  horaFin: string;
}

const DESCRIPCION_MAX = 1000;

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
    { value: 'lunes', label: 'Lunes', corto: 'Lun' },
    { value: 'martes', label: 'Martes', corto: 'Mar' },
    { value: 'miercoles', label: 'Miércoles', corto: 'Mié' },
    { value: 'jueves', label: 'Jueves', corto: 'Jue' },
    { value: 'viernes', label: 'Viernes', corto: 'Vie' },
    { value: 'sabado', label: 'Sábado', corto: 'Sáb' },
    { value: 'domingo', label: 'Domingo', corto: 'Dom' },
  ];

  protected readonly descripcionMax = DESCRIPCION_MAX;

  protected readonly idServicio = signal<number | null>(null);
  protected readonly isEditMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /** La categoría no se puede cambiar al editar: es lo que el prestador tiene aprobado. */
  protected readonly categoria = signal<CategoriaServicio>('paseador');

  protected readonly form = this.formBuilder.group({
    descripcion: ['', [Validators.maxLength(DESCRIPCION_MAX)]],
  });

  protected readonly reglas = signal<ReglaHorario[]>([]);
  protected readonly diasSeleccionados = signal<ReadonlySet<DiaSemana>>(new Set());
  protected readonly horaInicio = signal('');
  protected readonly horaFin = signal('');
  protected readonly formError = signal<string | null>(null);

  protected readonly cantidadCaracteres = computed(
    () => (this.form.controls.descripcion.value ?? '').length,
  );

  private siguienteId = 1;

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
        this.categoria.set(servicio.categoria);
        this.form.patchValue({ descripcion: servicio.descripcion ?? '' });
        this.reglas.set(this.agruparPorFranja(servicio.disponibilidades));
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar el servicio.');
      },
    });
  }

  protected elegirCategoria(categoria: CategoriaServicio): void {
    if (!this.isEditMode()) {
      this.categoria.set(categoria);
    }
  }

  protected toggleDia(dia: DiaSemana): void {
    const seleccionados = new Set(this.diasSeleccionados());
    if (seleccionados.has(dia)) {
      seleccionados.delete(dia);
    } else {
      seleccionados.add(dia);
    }
    this.diasSeleccionados.set(seleccionados);
  }

  protected esDiaSeleccionado(dia: DiaSemana): boolean {
    return this.diasSeleccionados().has(dia);
  }

  protected setHoraInicio(value: string): void {
    this.horaInicio.set(value);
  }

  protected setHoraFin(value: string): void {
    this.horaFin.set(value);
  }

  protected agregarRegla(): void {
    const dias = this.ordenarDias([...this.diasSeleccionados()]);

    if (dias.length === 0) {
      this.formError.set('Seleccioná al menos un día.');
      return;
    }
    if (!this.horaInicio() || !this.horaFin()) {
      this.formError.set('Completá el horario desde y hasta.');
      return;
    }
    if (this.horaInicio() >= this.horaFin()) {
      this.formError.set('El horario "hasta" tiene que ser posterior al "desde".');
      return;
    }

    this.formError.set(null);
    this.reglas.update((reglas) => [
      ...reglas,
      { id: this.siguienteId++, dias, horaInicio: this.horaInicio(), horaFin: this.horaFin() },
    ]);
    this.diasSeleccionados.set(new Set());
    this.horaInicio.set('');
    this.horaFin.set('');
  }

  protected quitarRegla(id: number): void {
    this.reglas.update((reglas) => reglas.filter((regla) => regla.id !== id));
  }

  /** "Lun a Vie", "Lun, Mié y Vie" o "Todos los días". */
  protected resumenDias(dias: DiaSemana[]): string {
    const orden = this.dias.map((d) => d.value);
    const indices = dias.map((dia) => orden.indexOf(dia)).sort((a, b) => a - b);
    const cortos = indices.map((i) => this.dias[i].corto);

    if (cortos.length === 7) {
      return 'Todos los días';
    }
    const corrido = indices.every((indice, i) => i === 0 || indice === indices[i - 1] + 1);
    if (cortos.length >= 3 && corrido) {
      return `${cortos[0]} a ${cortos[cortos.length - 1]}`;
    }
    if (cortos.length > 1) {
      return `${cortos.slice(0, -1).join(', ')} y ${cortos[cortos.length - 1]}`;
    }
    return cortos[0] ?? '';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.reglas().length === 0) {
      this.errorMessage.set('Agregá al menos un horario antes de guardar.');
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    const disponibilidades: DisponibilidadRequest[] = this.reglas().flatMap((regla) =>
      regla.dias.map((dia) => ({
        diaSemana: dia,
        horaInicio: regla.horaInicio,
        horaFin: regla.horaFin,
      })),
    );
    const payload = {
      categoria: this.categoria(),
      descripcion: this.form.controls.descripcion.value?.trim() || undefined,
      disponibilidades,
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

  /** Reconstruye las franjas agrupando los días que comparten horario. */
  private agruparPorFranja(
    disponibilidades: { diaSemana: DiaSemana; horaInicio: string; horaFin: string }[],
  ): ReglaHorario[] {
    const grupos = new Map<string, ReglaHorario>();

    for (const disponibilidad of disponibilidades) {
      const horaInicio = disponibilidad.horaInicio.slice(0, 5);
      const horaFin = disponibilidad.horaFin.slice(0, 5);
      const clave = `${horaInicio}-${horaFin}`;
      const existente = grupos.get(clave);

      if (existente) {
        existente.dias.push(disponibilidad.diaSemana);
      } else {
        grupos.set(clave, {
          id: this.siguienteId++,
          dias: [disponibilidad.diaSemana],
          horaInicio,
          horaFin,
        });
      }
    }

    return [...grupos.values()].map((regla) => ({ ...regla, dias: this.ordenarDias(regla.dias) }));
  }

  private ordenarDias(dias: DiaSemana[]): DiaSemana[] {
    const orden = this.dias.map((d) => d.value);
    return [...dias].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  }
}

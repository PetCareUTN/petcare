import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiError } from '../../../auth/models/user';
import {
  DiaSemana,
  DisponibilidadVeterinariaRequest,
  DisponibilidadVeterinariaResponse,
} from '../../models/disponibilidad-veterinaria';
import { DisponibilidadesVeterinariasService } from '../../services/disponibilidades-veterinarias-service';

type DiaOption = { value: DiaSemana; letra: string; label: string };

/** Una franja horaria que se ofrece uno o varios días (ej. L-M-M-J-V 09 a 18, 1 turno). */
interface ReglaDisponibilidad {
  /** Id local, solo para trackear la fila en la UI hasta guardar. */
  id: number;
  dias: DiaSemana[];
  horaInicio: string;
  horaFin: string;
  cantidadTurnos: number;
}

const DIAS: DiaOption[] = [
  { value: 'lunes', letra: 'L', label: 'Lunes' },
  { value: 'martes', letra: 'M', label: 'Martes' },
  { value: 'miercoles', letra: 'M', label: 'Miércoles' },
  { value: 'jueves', letra: 'J', label: 'Jueves' },
  { value: 'viernes', letra: 'V', label: 'Viernes' },
  { value: 'sabado', letra: 'S', label: 'Sábado' },
  { value: 'domingo', letra: 'D', label: 'Domingo' },
];

@Component({
  selector: 'app-configuracion-disponibilidad',
  imports: [],
  templateUrl: './configuracion-disponibilidad.html',
  styleUrl: './configuracion-disponibilidad.css',
})
export class ConfiguracionDisponibilidadPage implements OnInit {
  private readonly disponibilidadesService = inject(DisponibilidadesVeterinariasService);

  protected readonly dias = DIAS;

  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);

  protected readonly reglas = signal<ReglaDisponibilidad[]>([]);

  /** Estado del formulario para agregar una nueva franja. */
  protected readonly diasSeleccionados = signal<ReadonlySet<DiaSemana>>(new Set());
  protected readonly horaInicio = signal('');
  protected readonly horaFin = signal('');
  protected readonly cantidadTurnos = signal(1);

  private siguienteId = 1;

  ngOnInit(): void {
    this.disponibilidadesService.getMine().subscribe({
      next: (disponibilidades) => {
        this.isLoading.set(false);
        this.reglas.set(this.agruparPorFranja(disponibilidades));
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar la disponibilidad.');
      },
    });
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

  protected setCantidadTurnos(value: string): void {
    this.cantidadTurnos.set(Number(value) || 0);
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
    const cantidad = this.cantidadTurnos();
    if (!cantidad || cantidad < 1 || cantidad > 20) {
      this.formError.set('La cantidad de turnos tiene que estar entre 1 y 20.');
      return;
    }

    this.formError.set(null);
    this.reglas.set([
      ...this.reglas(),
      {
        id: this.siguienteId++,
        dias,
        horaInicio: this.horaInicio(),
        horaFin: this.horaFin(),
        cantidadTurnos: cantidad,
      },
    ]);

    this.diasSeleccionados.set(new Set());
    this.horaInicio.set('');
    this.horaFin.set('');
    this.cantidadTurnos.set(1);
  }

  protected quitarRegla(id: number): void {
    this.reglas.set(this.reglas().filter((regla) => regla.id !== id));
  }

  protected guardar(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (this.reglas().length === 0) {
      this.errorMessage.set('Agregá al menos un horario de atención antes de guardar.');
      return;
    }

    this.isSubmitting.set(true);

    const disponibilidades: DisponibilidadVeterinariaRequest[] = this.reglas().flatMap((regla) =>
      regla.dias.map((dia) => ({
        diaSemana: dia,
        horaInicio: regla.horaInicio,
        horaFin: regla.horaFin,
        cuposPorTurno: regla.cantidadTurnos,
      })),
    );

    this.disponibilidadesService.replaceMine({ disponibilidades }).subscribe({
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

  protected diaLetra(dia: DiaSemana): string {
    return this.dias.find((d) => d.value === dia)?.letra ?? '?';
  }

  protected diaLabel(dia: DiaSemana): string {
    return this.dias.find((d) => d.value === dia)?.label ?? dia;
  }

  /** Reconstruye las franjas agrupando los días que comparten horario y cantidad. */
  private agruparPorFranja(
    disponibilidades: DisponibilidadVeterinariaResponse[],
  ): ReglaDisponibilidad[] {
    const grupos = new Map<string, ReglaDisponibilidad>();

    for (const disponibilidad of disponibilidades) {
      const horaInicio = disponibilidad.horaInicio.slice(0, 5);
      const horaFin = disponibilidad.horaFin.slice(0, 5);
      const clave = `${horaInicio}-${horaFin}-${disponibilidad.cuposPorTurno}`;
      const existente = grupos.get(clave);

      if (existente) {
        existente.dias.push(disponibilidad.diaSemana);
      } else {
        grupos.set(clave, {
          id: this.siguienteId++,
          dias: [disponibilidad.diaSemana],
          horaInicio,
          horaFin,
          cantidadTurnos: disponibilidad.cuposPorTurno,
        });
      }
    }

    return [...grupos.values()].map((regla) => ({
      ...regla,
      dias: this.ordenarDias(regla.dias),
    }));
  }

  private ordenarDias(dias: DiaSemana[]): DiaSemana[] {
    const orden = this.dias.map((d) => d.value);
    return [...dias].sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
  }
}

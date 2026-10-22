import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { TurnoServicioResponse } from '../../../turnos-servicios/models/turno-servicio';
import { TurnosServiciosService } from '../../../turnos-servicios/services/turnos-servicios-service';
import { CategoriaServicio, ServicioResponse } from '../../models/servicio';
import { ServiciosService } from '../../services/servicios-service';

const CATEGORIA_LABELS: Record<CategoriaServicio, string> = {
  paseador: 'Paseador',
  guarderia: 'Guardería',
  peluqueria: 'Peluquería',
};

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_FECHA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** Cuántos turnos se listan en "Próximos turnos". */
const MAX_PROXIMOS = 6;
const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

const DIA_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

@Component({
  selector: 'app-servicios-list',
  imports: [RouterLink],
  templateUrl: './servicios-list.html',
  styleUrl: './servicios-list.css',
})
export class ServiciosListPage implements OnInit {
  private readonly serviciosService = inject(ServiciosService);
  private readonly turnosServiciosService = inject(TurnosServiciosService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly servicios = signal<ServicioResponse[]>([]);
  protected readonly deletingId = signal<number | null>(null);
  private readonly turnos = signal<TurnoServicioResponse[]>([]);

  /** Turnos confirmados que todavía no empezaron, del más cercano al más lejano. */
  private readonly turnosFuturos = computed(() =>
    this.turnos()
      .filter((turno) => turno.estado === 'confirmado' && this.inicio(turno) > Date.now())
      .sort((a, b) => this.inicio(a) - this.inicio(b)),
  );

  protected readonly proximos = computed(() => this.turnosFuturos().slice(0, MAX_PROXIMOS));

  protected readonly turnosProximos = computed(() => this.turnosFuturos().length);

  protected readonly turnosSemana = computed(
    () =>
      this.turnosFuturos().filter((turno) => this.inicio(turno) - Date.now() <= SIETE_DIAS_MS)
        .length,
  );

  /** Mascotas distintas que ya pasaron por alguno de sus servicios. */
  protected readonly mascotasAtendidas = computed(
    () =>
      new Set(
        this.turnos()
          .filter(
            (turno) =>
              turno.estado === 'completado' ||
              (turno.estado === 'confirmado' && this.inicio(turno) <= Date.now()),
          )
          .map((turno) => turno.idMascota),
      ).size,
  );

  ngOnInit(): void {
    // Los turnos solo enriquecen la pantalla: si no cargan, se muestra el resto.
    this.turnosServiciosService.getRecibidas().subscribe({
      next: (turnos) => this.turnos.set(turnos),
      error: () => this.turnos.set([]),
    });

    this.serviciosService.getMine().subscribe({
      next: (servicios) => {
        this.isLoading.set(false);
        this.servicios.set(servicios);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar tus servicios.');
      },
    });
  }

  protected categoriaLabel(categoria: string): string {
    return CATEGORIA_LABELS[categoria as CategoriaServicio] ?? categoria;
  }

  protected diaLabel(dia: string): string {
    return DIA_LABELS[dia] ?? dia;
  }

  protected formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  protected eliminar(servicio: ServicioResponse): void {
    if (!confirm('¿Seguro que querés eliminar este servicio? Esta acción no se puede deshacer.')) {
      return;
    }

    this.errorMessage.set(null);
    this.deletingId.set(servicio.idServicio);

    this.serviciosService.delete(servicio.idServicio).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.servicios.update((actuales) =>
          actuales.filter((s) => s.idServicio !== servicio.idServicio),
        );
      },
      error: (error: ApiError) => {
        this.deletingId.set(null);
        this.errorMessage.set(error.mensaje ?? 'No se pudo eliminar el servicio.');
      },
    });
  }

  /** Horarios de un servicio agrupados: "Lun a Vie · 09:00 – 18:00". */
  protected horarios(servicio: ServicioResponse): string[] {
    const grupos = new Map<string, number[]>();
    for (const disponibilidad of servicio.disponibilidades) {
      const clave = `${this.formatHora(disponibilidad.horaInicio)} – ${this.formatHora(disponibilidad.horaFin)}`;
      const indice = DIAS_ORDEN.indexOf(disponibilidad.diaSemana);
      grupos.set(clave, [...(grupos.get(clave) ?? []), indice]);
    }
    return [...grupos.entries()].map(([rango, indices]) => `${this.resumenDias(indices)} · ${rango}`);
  }

  protected iniciales(nombre: string): string {
    return (
      nombre
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('') || '?'
    );
  }

  protected diaCorto(turno: TurnoServicioResponse): string {
    return DIAS_FECHA[this.fechaLocal(turno.fecha).getDay()];
  }

  protected diaNumero(turno: TurnoServicioResponse): number {
    return this.fechaLocal(turno.fecha).getDate();
  }

  protected mes(turno: TurnoServicioResponse): string {
    return MESES_CORTOS[this.fechaLocal(turno.fecha).getMonth()];
  }

  private resumenDias(indices: number[]): string {
    const ordenados = [...new Set(indices)].sort((a, b) => a - b);
    const cortos = ordenados.map((i) => DIAS_CORTOS[i]);
    if (cortos.length === 7) {
      return 'Todos los días';
    }
    const corrido = ordenados.every((indice, i) => i === 0 || indice === ordenados[i - 1] + 1);
    if (cortos.length >= 3 && corrido) {
      return `${cortos[0]} a ${cortos[cortos.length - 1]}`;
    }
    if (cortos.length > 1) {
      return `${cortos.slice(0, -1).join(', ')} y ${cortos[cortos.length - 1]}`;
    }
    return cortos[0] ?? '';
  }

  private inicio(turno: TurnoServicioResponse): number {
    return new Date(`${turno.fecha}T${turno.horaInicio}`).getTime();
  }

  /** Fecha local a partir de YYYY-MM-DD, sin que el huso horario corra el día. */
  private fechaLocal(fecha: string): Date {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }
}

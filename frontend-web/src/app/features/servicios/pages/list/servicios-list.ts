import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import {
  CategoriaServicio,
  PerfilPrestadorResponse,
  ResenaServicio,
  ServicioResponse,
} from '../../models/servicio';
import { ServiciosService } from '../../services/servicios-service';

const CATEGORIA_LABELS: Record<CategoriaServicio, string> = {
  paseador: 'Paseador',
  guarderia: 'Guardería',
  peluqueria: 'Peluquería',
};

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Cuántas reseñas se listan: las más recientes. */
const MAX_RESENAS = 5;

interface ResenaConServicio extends ResenaServicio {
  categoria: CategoriaServicio;
}

@Component({
  selector: 'app-servicios-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './servicios-list.html',
  styleUrl: './servicios-list.css',
})
export class ServiciosListPage implements OnInit {
  private readonly serviciosService = inject(ServiciosService);

  protected readonly estrellas = [1, 2, 3, 4, 5];

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly servicios = signal<ServicioResponse[]>([]);
  protected readonly deletingId = signal<number | null>(null);
  private readonly perfiles = signal<Map<CategoriaServicio, PerfilPrestadorResponse>>(new Map());

  /** Todas las reseñas de todos sus servicios, de la más nueva a la más vieja. */
  private readonly todasLasResenas = computed<ResenaConServicio[]>(() =>
    [...this.perfiles()]
      .flatMap(([categoria, perfil]) => perfil.resenas.map((resena) => ({ ...resena, categoria })))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
  );

  protected readonly ultimasResenas = computed(() => this.todasLasResenas().slice(0, MAX_RESENAS));

  protected readonly totalResenas = computed(() => this.todasLasResenas().length);

  /** Promedio de todas las reseñas juntas (no el promedio de los promedios). */
  protected readonly promedio = computed<number | null>(() => {
    const resenas = this.todasLasResenas();
    return resenas.length
      ? resenas.reduce((suma, resena) => suma + resena.puntuacion, 0) / resenas.length
      : null;
  });

  protected readonly serviciosCompletados = computed(() =>
    [...this.perfiles().values()].reduce((suma, perfil) => suma + perfil.serviciosCompletados, 0),
  );

  /** Puntaje por categoría, para los servicios que ya tienen reseñas. */
  protected readonly puntajePorCategoria = computed(() =>
    [...this.perfiles()]
      .filter(([, perfil]) => perfil.promedio !== null)
      .map(([categoria, perfil]) => ({
        categoria,
        promedio: perfil.promedio as number,
        cantidad: perfil.resenas.length,
      })),
  );

  ngOnInit(): void {
    this.serviciosService.getMine().subscribe({
      next: (servicios) => {
        this.isLoading.set(false);
        this.servicios.set(servicios);
        this.cargarPerfiles(servicios);
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

  protected formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  /** "4,8": un decimal y con coma. */
  protected formatPromedio(promedio: number): string {
    return promedio.toFixed(1).replace('.', ',');
  }

  /** Cuántas estrellas se pintan: el puntaje redondeado. */
  protected estrellasLlenas(puntuacion: number): number {
    return Math.round(puntuacion);
  }

  /** Horarios de un servicio agrupados: "Lun a Vie · 09:00 – 18:00". */
  protected etiquetaDuracion(minutos: number): string {
    if (minutos < 60) {
      return `${minutos} min`;
    }
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
  }

  protected horarios(servicio: ServicioResponse): string[] {
    const grupos = new Map<string, number[]>();
    for (const disponibilidad of servicio.disponibilidades) {
      const clave = `${this.formatHora(disponibilidad.horaInicio)} – ${this.formatHora(disponibilidad.horaFin)}`;
      const indice = DIAS_ORDEN.indexOf(disponibilidad.diaSemana);
      grupos.set(clave, [...(grupos.get(clave) ?? []), indice]);
    }
    return [...grupos.entries()].map(
      ([rango, indices]) => `${this.resumenDias(indices)} · ${rango}`,
    );
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

  /**
   * Las reseñas solo enriquecen la pantalla: si alguna categoría no carga, se
   * muestra el resto. Se pide un perfil por categoría, aunque haya varios servicios.
   */
  private cargarPerfiles(servicios: ServicioResponse[]): void {
    const peticiones = new Map<CategoriaServicio, number>();
    for (const servicio of servicios) {
      peticiones.set(servicio.categoria, servicio.idUsuario);
    }
    if (peticiones.size === 0) {
      return;
    }

    forkJoin(
      [...peticiones].map(([categoria, idUsuario]) =>
        this.serviciosService
          .getPerfil(idUsuario, categoria)
          .pipe(catchError(() => of(null as PerfilPrestadorResponse | null))),
      ),
    ).subscribe((resultados) => {
      const perfiles = new Map<CategoriaServicio, PerfilPrestadorResponse>();
      [...peticiones.keys()].forEach((categoria, indice) => {
        const perfil = resultados[indice];
        if (perfil) {
          perfiles.set(categoria, perfil);
        }
      });
      this.perfiles.set(perfiles);
    });
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
}

import { Component, DestroyRef, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import { MascotaOwner, MascotaResponse } from '../../../mascotas/models/mascota';
import { BusquedaClientesService } from '../../../mascotas/services/busqueda-clientes-service';
import { MascotasService } from '../../../mascotas/services/mascotas-service';
import {
  AgendarTurnoError,
  CapacidadHorario,
  TurnoVeterinarioResponse,
} from '../../models/turno-veterinario';
import { TurnosVeterinariosService } from '../../services/turnos-veterinarios-service';

/** Espera tras la última tecla antes de buscar clientes. */
const SEARCH_DEBOUNCE_MS = 300;
const MOTIVO_MAX_LENGTH = 500;

type EstadoFranja = 'libre' | 'sobreturno' | 'completo';

interface Franja {
  hora: string;
  /** Cupos de atención que siguen libres. */
  libres: number;
  total: number;
  /**
   * `libre`: queda un turno normal. `sobreturno`: el turno que se agregue ya cuenta
   * como sobreturno. `completo`: no queda nada, y agregar uno es forzar el horario.
   */
  estado: EstadoFranja;
  /** Ya pasó: no se puede agendar. */
  pasada: boolean;
}

/**
 * Alta de un turno por parte de la veterinaria. Se abre desde la agenda, con
 * la fecha y la hora ya elegidas si vino de un doble clic sobre un horario.
 *
 * Solo se puede agendar dentro del horario de atención y de los sobreturnos.
 * Un horario completo se puede agendar igual, pero avisando antes.
 */
@Component({
  selector: 'app-nuevo-turno-modal',
  imports: [FormsModule],
  templateUrl: './nuevo-turno-modal.html',
  styleUrl: './nuevo-turno-modal.css',
})
export class NuevoTurnoModalComponent implements OnInit {
  private readonly turnosService = inject(TurnosVeterinariosService);
  private readonly mascotasService = inject(MascotasService);
  private readonly busquedaClientes = inject(BusquedaClientesService);
  private readonly destroyRef = inject(DestroyRef);

  /** Fecha (YYYY-MM-DD) con la que arranca el formulario. */
  readonly fechaInicial = input<string | null>(null);
  /** Hora (HH:MM) que se preselecciona si existe en esa fecha. */
  readonly horaInicial = input<string | null>(null);

  readonly cerrar = output<void>();
  readonly agendado = output<TurnoVeterinarioResponse>();

  protected readonly hoy = this.claveDeHoy();
  protected readonly motivoMaxLength = MOTIVO_MAX_LENGTH;

  protected readonly busqueda = signal('');
  protected readonly resultados = signal<MascotaOwner[]>([]);
  protected readonly buscando = signal(false);
  protected readonly yaBusco = signal(false);
  protected readonly cliente = signal<MascotaOwner | null>(null);

  protected readonly mascotas = signal<MascotaResponse[]>([]);
  protected readonly cargandoMascotas = signal(false);
  protected readonly mascota = signal<MascotaResponse | null>(null);

  protected readonly fecha = signal('');
  protected readonly cargandoFranjas = signal(false);
  private readonly capacidad = signal<CapacidadHorario[]>([]);
  protected readonly hora = signal<string | null>(null);
  protected readonly motivo = signal('');

  protected readonly guardando = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  /** Respuesta 409: el horario se llenó y falta que el veterinario confirme. */
  protected readonly confirmarForzar = signal<{ cupos: number; ocupados: number } | null>(null);

  private readonly busqueda$ = new Subject<string>();

  protected readonly pista = computed(() => this.busquedaClientes.pista(this.busqueda()));

  /** Franjas con cupos de la fecha elegida, ordenadas por hora. */
  protected readonly franjas = computed<Franja[]>(() => {
    const fecha = this.fecha();
    return this.capacidad()
      .filter((c) => c.fecha === fecha && c.cuposAtencion + c.cuposSobreturno > 0)
      .map((c) => {
        const total = c.cuposAtencion + c.cuposSobreturno;
        const estado: EstadoFranja =
          total - c.ocupados <= 0
            ? 'completo'
            : c.ocupados >= c.cuposAtencion
              ? 'sobreturno'
              : 'libre';
        return {
          hora: c.hora,
          libres: Math.max(c.cuposAtencion - c.ocupados, 0),
          total,
          estado,
          pasada: new Date(`${fecha}T${c.hora}`).getTime() <= Date.now(),
        };
      })
      .sort((a, b) => a.hora.localeCompare(b.hora));
  });

  protected readonly franjaElegida = computed(
    () => this.franjas().find((franja) => franja.hora === this.hora()) ?? null,
  );

  protected readonly puedeAgendar = computed(
    () =>
      !!this.cliente() &&
      !!this.mascota() &&
      !!this.fecha() &&
      !!this.franjaElegida() &&
      !this.franjaElegida()!.pasada &&
      !this.guardando(),
  );

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        tap((texto) => this.buscando.set(this.busquedaClientes.puedeBuscar(texto))),
        switchMap((texto) =>
          this.busquedaClientes.puedeBuscar(texto) ? this.busquedaClientes.buscar(texto) : of(null),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultados) => {
        this.buscando.set(false);
        this.yaBusco.set(resultados !== null);
        this.resultados.set(resultados ?? []);
      });
  }

  ngOnInit(): void {
    this.fecha.set(this.fechaInicial() ?? this.hoy);
    this.cargarFranjas(this.horaInicial());
  }

  protected buscar(texto: string): void {
    this.busqueda.set(texto);
    this.yaBusco.set(false);
    this.resultados.set([]);
    this.busqueda$.next(texto.trim());
  }

  protected nombreCliente(owner: MascotaOwner): string {
    return [owner.nombre, owner.apellido].filter(Boolean).join(' ');
  }

  protected iniciales(owner: MascotaOwner): string {
    return (
      [owner.nombre, owner.apellido]
        .filter((parte): parte is string => !!parte)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('') || '?'
    );
  }

  protected elegirCliente(owner: MascotaOwner): void {
    this.cliente.set(owner);
    this.busqueda.set('');
    this.resultados.set([]);
    this.yaBusco.set(false);
    this.mascota.set(null);
    this.mascotas.set([]);
    this.cargandoMascotas.set(true);

    this.mascotasService.findByOwner(owner.id_usuario).subscribe({
      next: (mascotas) => {
        this.cargandoMascotas.set(false);
        this.mascotas.set(mascotas);
        // Con una sola mascota no hay nada que elegir.
        if (mascotas.length === 1) {
          this.mascota.set(mascotas[0]);
        }
      },
      error: (error: ApiError) => {
        this.cargandoMascotas.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar las mascotas del cliente.');
      },
    });
  }

  protected cambiarCliente(): void {
    this.cliente.set(null);
    this.mascota.set(null);
    this.mascotas.set([]);
    this.busqueda$.next('');
  }

  protected fotoUrl(mascota: MascotaResponse): string | null {
    return mascota.foto ? this.mascotasService.resolveFotoUrl(mascota.foto) : null;
  }

  protected cambiarFecha(fecha: string): void {
    this.fecha.set(fecha);
    this.hora.set(null);
    this.confirmarForzar.set(null);
    if (fecha) {
      this.cargarFranjas(null);
    }
  }

  protected elegirHora(franja: Franja): void {
    if (franja.pasada) {
      return;
    }
    this.hora.set(franja.hora);
    this.confirmarForzar.set(null);
    this.errorMessage.set(null);
  }

  /** Los sobreturnos se distinguen solo por el color, sin texto. */
  protected etiquetaFranja(franja: Franja): string | null {
    if (franja.estado !== 'libre') {
      return null;
    }
    return franja.libres === 1 ? '1 cupo' : `${franja.libres} cupos`;
  }

  /** El turno que se va a cargar queda como sobreturno (hay que aclararlo en la pantalla). */
  protected readonly esSobreturno = computed(() => {
    const estado = this.franjaElegida()?.estado;
    return estado === 'sobreturno' || estado === 'completo';
  });

  protected agendar(): void {
    this.enviar(this.franjaElegida()?.estado === 'completo');
  }

  /** El veterinario confirmó que quiere agendar aunque no queden cupos. */
  protected agendarIgual(): void {
    this.enviar(true);
  }

  protected volverAElegirHorario(): void {
    this.confirmarForzar.set(null);
    this.hora.set(null);
    this.cargarFranjas(null);
  }

  private enviar(forzar: boolean): void {
    const cliente = this.cliente();
    const mascota = this.mascota();
    const hora = this.hora();
    if (!cliente || !mascota || !hora || !this.fecha()) {
      return;
    }

    this.guardando.set(true);
    this.errorMessage.set(null);

    this.turnosService
      .agendar({
        idMascota: mascota.idMascota,
        idDuenio: cliente.id_usuario,
        fecha: this.fecha(),
        hora,
        motivoConsulta: this.motivo().trim() || undefined,
        forzar,
      })
      .subscribe({
        next: (turno) => {
          this.guardando.set(false);
          this.agendado.emit(turno);
        },
        error: (error: AgendarTurnoError) => {
          this.guardando.set(false);
          if (error.codigoEstado === 409 && error.codigo === 'CUPO_LLENO') {
            this.confirmarForzar.set({ cupos: error.cupos ?? 0, ocupados: error.ocupados ?? 0 });
            return;
          }
          this.errorMessage.set(error.mensaje ?? 'No se pudo agendar el turno.');
        },
      });
  }

  private cargarFranjas(horaPreferida: string | null): void {
    const fecha = this.fecha();
    if (!fecha) {
      return;
    }

    this.cargandoFranjas.set(true);
    this.turnosService.getAgenda(fecha, fecha).subscribe({
      next: (capacidad) => {
        this.cargandoFranjas.set(false);
        this.capacidad.set(capacidad);
        const preferida = this.franjas().find(
          (franja) => franja.hora === horaPreferida && !franja.pasada,
        );
        if (preferida) {
          this.hora.set(preferida.hora);
        }
      },
      error: (error: ApiError) => {
        this.cargandoFranjas.set(false);
        this.capacidad.set([]);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar los horarios.');
      },
    });
  }

  private claveDeHoy(): string {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }
}

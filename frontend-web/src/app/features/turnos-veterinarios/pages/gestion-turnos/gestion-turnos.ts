import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import {
  AppointmentStatus,
  TurnoVeterinarioResponse,
} from '../../models/turno-veterinario';
import { TurnosVeterinariosService } from '../../services/turnos-veterinarios-service';

type EstadoOption = { value: AppointmentStatus; label: string };
type VistaCalendario = 'mes' | 'semana' | 'dia';

type VistaOption = { value: VistaCalendario; label: string };

interface DiaCalendario {
  fecha: string;
  numero: number;
  esDelMesActual: boolean;
  esHoy: boolean;
  turnos: TurnoVeterinarioResponse[];
}

interface FilaHoraria {
  hora: number;
  etiqueta: string;
  celdas: { fecha: string; turnos: TurnoVeterinarioResponse[] }[];
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const DIAS_SEMANA_LARGO = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

/** Rango horario mínimo que se muestra en las vistas de semana y día. */
const HORA_INICIO_POR_DEFECTO = 8;
const HORA_FIN_POR_DEFECTO = 20;

@Component({
  selector: 'app-gestion-turnos-veterinarios',
  imports: [FormsModule],
  templateUrl: './gestion-turnos.html',
  styleUrl: './gestion-turnos.css',
})
export class GestionTurnosVeterinariosPage implements OnInit {
  private readonly turnosService = inject(TurnosVeterinariosService);

  protected readonly estados: EstadoOption[] = [
    { value: 'pendiente', label: 'Pendientes' },
    { value: 'confirmado', label: 'Confirmados' },
    { value: 'rechazado', label: 'Rechazados' },
    { value: 'cancelado', label: 'Cancelados' },
  ];

  protected readonly vistas: VistaOption[] = [
    { value: 'mes', label: 'Mes' },
    { value: 'semana', label: 'Semana' },
    { value: 'dia', label: 'Día' },
  ];

  protected readonly diasSemana = DIAS_SEMANA;

  protected readonly vista = signal<VistaCalendario>('mes');
  /** Fecha de referencia (YYYY-MM-DD) sobre la que se arma la vista actual. */
  protected readonly fechaFoco = signal(this.claveDeHoy());
  protected readonly estadosVisibles = signal<AppointmentStatus[]>([
    'pendiente',
    'confirmado',
  ]);

  protected readonly turnos = signal<TurnoVeterinarioResponse[]>([]);
  protected readonly turnoSeleccionadoId = signal<number | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly processingTurnoId = signal<number | null>(null);
  protected readonly isRejecting = signal(false);
  protected readonly rejectionReason = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly turnosVisibles = computed(() => {
    const visibles = this.estadosVisibles();
    return this.turnos().filter((turno) => visibles.includes(turno.estado));
  });

  /** Turnos visibles agrupados por fecha y ordenados por hora. */
  private readonly turnosPorFecha = computed(() => {
    const agrupados = new Map<string, TurnoVeterinarioResponse[]>();
    for (const turno of this.turnosVisibles()) {
      const delDia = agrupados.get(turno.fecha);
      if (delDia) {
        delDia.push(turno);
      } else {
        agrupados.set(turno.fecha, [turno]);
      }
    }
    for (const delDia of agrupados.values()) {
      delDia.sort((a, b) => a.hora.localeCompare(b.hora));
    }
    return agrupados;
  });

  protected readonly turnoSeleccionado = computed(() => {
    const id = this.turnoSeleccionadoId();
    return id === null ? null : (this.turnos().find((t) => t.idTurno === id) ?? null);
  });

  protected readonly conteoPorEstado = computed(() => {
    const conteo = new Map<AppointmentStatus, number>();
    for (const turno of this.turnos()) {
      conteo.set(turno.estado, (conteo.get(turno.estado) ?? 0) + 1);
    }
    return conteo;
  });

  /** Grilla de 6 semanas del mes en foco, empezando siempre en lunes. */
  protected readonly gridMes = computed<DiaCalendario[]>(() => {
    const foco = this.parseClave(this.fechaFoco());
    const primerDia = new Date(foco.getFullYear(), foco.getMonth(), 1);
    const inicio = this.inicioDeSemana(primerDia);
    const dias: DiaCalendario[] = [];

    for (let i = 0; i < 42; i++) {
      const fecha = this.sumarDias(inicio, i);
      dias.push(this.armarDia(fecha, fecha.getMonth() === foco.getMonth()));
    }
    return dias;
  });

  protected readonly diasSemanaEnFoco = computed<DiaCalendario[]>(() => {
    const inicio = this.inicioDeSemana(this.parseClave(this.fechaFoco()));
    return Array.from({ length: 7 }, (_, i) =>
      this.armarDia(this.sumarDias(inicio, i), true),
    );
  });

  protected readonly diaEnFoco = computed<DiaCalendario>(() =>
    this.armarDia(this.parseClave(this.fechaFoco()), true),
  );

  /** Días que alimentan la grilla horaria: 7 en vista semana, 1 en vista día. */
  protected readonly diasDeGrillaHoraria = computed<DiaCalendario[]>(() =>
    this.vista() === 'semana' ? this.diasSemanaEnFoco() : [this.diaEnFoco()],
  );

  protected readonly filasHorarias = computed<FilaHoraria[]>(() => {
    const dias = this.diasDeGrillaHoraria();
    const horasConTurnos = dias
      .flatMap((dia) => dia.turnos)
      .map((turno) => Number(turno.hora.slice(0, 2)));

    const desde = Math.min(HORA_INICIO_POR_DEFECTO, ...horasConTurnos);
    const hasta = Math.max(HORA_FIN_POR_DEFECTO, ...horasConTurnos);

    const filas: FilaHoraria[] = [];
    for (let hora = desde; hora <= hasta; hora++) {
      filas.push({
        hora,
        etiqueta: `${String(hora).padStart(2, '0')}:00`,
        celdas: dias.map((dia) => ({
          fecha: dia.fecha,
          turnos: dia.turnos.filter((turno) => Number(turno.hora.slice(0, 2)) === hora),
        })),
      });
    }
    return filas;
  });

  protected readonly tituloPeriodo = computed(() => {
    const foco = this.parseClave(this.fechaFoco());

    if (this.vista() === 'mes') {
      return `${this.capitalizar(MESES[foco.getMonth()])} ${foco.getFullYear()}`;
    }

    if (this.vista() === 'dia') {
      const nombreDia = DIAS_SEMANA_LARGO[this.indiceDesdeLunes(foco)];
      return `${nombreDia} ${foco.getDate()} de ${MESES[foco.getMonth()]} de ${foco.getFullYear()}`;
    }

    const inicio = this.inicioDeSemana(foco);
    const fin = this.sumarDias(inicio, 6);
    const mismoMes = inicio.getMonth() === fin.getMonth();
    const inicioTexto = mismoMes
      ? `${inicio.getDate()}`
      : `${inicio.getDate()} de ${MESES[inicio.getMonth()]}`;
    return (
      `${inicioTexto} al ${fin.getDate()} de ${MESES[fin.getMonth()]} ` +
      `de ${fin.getFullYear()}`
    );
  });

  ngOnInit(): void {
    this.loadTurnos();
  }

  protected setVista(vista: VistaCalendario): void {
    this.vista.set(vista);
  }

  /** Abre el día indicado en la vista de detalle (zoom desde mes o semana). */
  protected verDetalleDelDia(fecha: string): void {
    this.fechaFoco.set(fecha);
    this.vista.set('dia');
  }

  protected irAHoy(): void {
    this.fechaFoco.set(this.claveDeHoy());
  }

  protected desplazar(direccion: -1 | 1): void {
    const foco = this.parseClave(this.fechaFoco());

    if (this.vista() === 'mes') {
      this.fechaFoco.set(
        this.toClave(new Date(foco.getFullYear(), foco.getMonth() + direccion, 1)),
      );
      return;
    }

    const dias = this.vista() === 'semana' ? 7 : 1;
    this.fechaFoco.set(this.toClave(this.sumarDias(foco, dias * direccion)));
  }

  protected toggleEstado(estado: AppointmentStatus): void {
    const visibles = this.estadosVisibles();
    this.estadosVisibles.set(
      visibles.includes(estado)
        ? visibles.filter((value) => value !== estado)
        : [...visibles, estado],
    );
  }

  protected esEstadoVisible(estado: AppointmentStatus): boolean {
    return this.estadosVisibles().includes(estado);
  }

  protected conteo(estado: AppointmentStatus): number {
    return this.conteoPorEstado().get(estado) ?? 0;
  }

  protected seleccionarTurno(turno: TurnoVeterinarioResponse): void {
    this.turnoSeleccionadoId.set(turno.idTurno);
    this.cancelReject();
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected cerrarPanel(): void {
    this.turnoSeleccionadoId.set(null);
    this.cancelReject();
  }

  protected confirmar(turno: TurnoVeterinarioResponse): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.processingTurnoId.set(turno.idTurno);

    this.turnosService.confirmar(turno.idTurno).subscribe({
      next: () => {
        this.processingTurnoId.set(null);
        this.successMessage.set('Turno confirmado correctamente.');
        this.loadTurnos();
      },
      error: (error: ApiError) => {
        this.processingTurnoId.set(null);
        this.errorMessage.set(error.mensaje ?? 'No se pudo confirmar el turno.');
      },
    });
  }

  protected startReject(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isRejecting.set(true);
    this.rejectionReason.set('');
  }

  protected cancelReject(): void {
    this.isRejecting.set(false);
    this.rejectionReason.set('');
  }

  protected rechazar(turno: TurnoVeterinarioResponse): void {
    const motivoRechazo = this.rejectionReason().trim();
    if (!motivoRechazo) {
      this.errorMessage.set('Ingresá un motivo de rechazo.');
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.processingTurnoId.set(turno.idTurno);

    this.turnosService.rechazar(turno.idTurno, { motivoRechazo }).subscribe({
      next: () => {
        this.processingTurnoId.set(null);
        this.cancelReject();
        this.successMessage.set('Turno rechazado correctamente.');
        this.loadTurnos();
      },
      error: (error: ApiError) => {
        this.processingTurnoId.set(null);
        this.errorMessage.set(error.mensaje ?? 'No se pudo rechazar el turno.');
      },
    });
  }

  /** Nombre corto del día ("Lun", "Mar"...) para una fecha YYYY-MM-DD. */
  protected nombreCortoDia(fecha: string): string {
    return DIAS_SEMANA[this.indiceDesdeLunes(this.parseClave(fecha))];
  }

  protected formatDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  protected formatTime(value: string): string {
    return value.slice(0, 5);
  }

  protected estadoLabel(estado: AppointmentStatus): string {
    return this.estados.find((option) => option.value === estado)?.label ?? estado;
  }

  /** Etiqueta en singular para mostrar el estado de un turno puntual. */
  protected estadoLabelSingular(estado: AppointmentStatus): string {
    return this.estadoLabel(estado).replace(/s$/, '');
  }

  private loadTurnos(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.turnosService.getMine().subscribe({
      next: (turnos) => {
        this.turnos.set(turnos);
        this.isLoading.set(false);
      },
      error: (error: ApiError) => {
        this.turnos.set([]);
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar los turnos.');
      },
    });
  }

  private armarDia(fecha: Date, esDelMesActual: boolean): DiaCalendario {
    const clave = this.toClave(fecha);
    return {
      fecha: clave,
      numero: fecha.getDate(),
      esDelMesActual,
      esHoy: clave === this.claveDeHoy(),
      turnos: this.turnosPorFecha().get(clave) ?? [],
    };
  }

  /**
   * Convierte una fecha a YYYY-MM-DD usando los componentes locales. No se usa
   * toISOString() porque desplaza el día según la zona horaria.
   */
  private toClave(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  /** Crea la fecha local a partir de YYYY-MM-DD, evitando el parseo como UTC. */
  private parseClave(clave: string): Date {
    const [year, month, day] = clave.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private claveDeHoy(): string {
    return this.toClave(new Date());
  }

  private sumarDias(fecha: Date, dias: number): Date {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
  }

  private inicioDeSemana(fecha: Date): Date {
    return this.sumarDias(fecha, -this.indiceDesdeLunes(fecha));
  }

  /** 0 = lunes ... 6 = domingo. */
  private indiceDesdeLunes(fecha: Date): number {
    return (fecha.getDay() + 6) % 7;
  }

  private capitalizar(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}

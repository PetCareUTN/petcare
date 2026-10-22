import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import {
  CanceladoPor,
  TurnoServicioEstado,
  TurnoServicioResponse,
} from '../../../turnos-servicios/models/turno-servicio';
import { TurnosServiciosService } from '../../../turnos-servicios/services/turnos-servicios-service';
import { NuevoTurnoModalComponent } from '../../components/nuevo-turno-modal/nuevo-turno-modal';
import {
  AppointmentStatus,
  CapacidadHorario,
  TurnoVeterinarioResponse,
} from '../../models/turno-veterinario';
import { TurnosVeterinariosService } from '../../services/turnos-veterinarios-service';

/** Estados posibles de cualquiera de los dos tipos de turno. */
type EstadoTurno = AppointmentStatus | TurnoServicioEstado;
type TipoTurno = 'veterinaria' | 'servicio';

type EstadoOption = { value: EstadoTurno; label: string };
type TipoOption = { value: TipoTurno; label: string };

type VistaCalendario = 'mes' | 'semana' | 'dia';
type VistaOption = { value: VistaCalendario; label: string };

/**
 * Turno normalizado para el calendario. Unifica turnos veterinarios y turnos
 * de servicios, que tienen formas distintas pero se muestran en la misma grilla.
 */
interface EventoTurno {
  /** Los ids se repiten entre ambas tablas, asi que la clave lleva el tipo. */
  clave: string;
  tipo: TipoTurno;
  idTurno: number;
  fecha: string;
  hora: string;
  horaFin: string | null;
  estado: EstadoTurno;
  nombreMascota: string;
  nombreDuenio: string;
  emailDuenio: string;
  telefonoDuenio: string | null;
  categoria: string | null;
  detalle: string | null;
  motivoNegativo: string | null;
  canceladoPor: CanceladoPor | null;
  veterinario: TurnoVeterinarioResponse | null;
  servicio: TurnoServicioResponse | null;
}

type EstadoFranja = 'libre' | 'sobreturno' | 'completo';

/** Capacidad de una franja de 30 minutos de la agenda, lista para mostrar. */
interface FranjaAgenda {
  total: number;
  libres: number;
  estado: EstadoFranja;
  /** Ya pasó: no se puede agendar. */
  pasada: boolean;
}

/** Media hora de una celda horaria: su disponibilidad y los turnos que caen en ella. */
interface MitadDeHora {
  hora: string;
  franja: FranjaAgenda | null;
  turnos: EventoTurno[];
}

interface DiaCalendario {
  fecha: string;
  numero: number;
  esDelMesActual: boolean;
  esHoy: boolean;
  turnos: EventoTurno[];
  /** Turnos que todavía se pueden agendar ese día (0 si no hay cupos). */
  libres: number;
}

interface FilaHoraria {
  hora: number;
  etiqueta: string;
  celdas: {
    fecha: string;
    mitades: MitadDeHora[];
  }[];
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
  imports: [FormsModule, NuevoTurnoModalComponent],
  templateUrl: './gestion-turnos.html',
  styleUrl: './gestion-turnos.css',
})
export class GestionTurnosVeterinariosPage implements OnInit {
  private readonly turnosService = inject(TurnosVeterinariosService);
  private readonly turnosServiciosService = inject(TurnosServiciosService);

  /** Alta de turno abierta: con la fecha y hora del doble clic, si las hubo. */
  protected readonly nuevoTurno = signal<{ fecha: string | null; hora: string | null } | null>(null);

  protected readonly estados: EstadoOption[] = [
    { value: 'confirmado', label: 'Confirmados' },
    { value: 'asistio', label: 'Asistieron' },
    { value: 'ausente', label: 'Ausentes' },
    { value: 'cancelado', label: 'Cancelados' },
  ];

  protected readonly tipos: TipoOption[] = [
    { value: 'veterinaria', label: 'Veterinaria' },
    { value: 'servicio', label: 'Mis servicios' },
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
  protected readonly estadosVisibles = signal<EstadoTurno[]>(['confirmado']);
  protected readonly tiposVisibles = signal<TipoTurno[]>(['veterinaria', 'servicio']);

  protected readonly turnos = signal<TurnoVeterinarioResponse[]>([]);
  protected readonly turnosServicios = signal<TurnoServicioResponse[]>([]);
  /** Capacidad de la agenda en el rango visible (huecos libres y completos). */
  protected readonly capacidad = signal<CapacidadHorario[]>([]);
  protected readonly turnoSeleccionadoClave = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isLoadingServicios = signal(true);
  protected readonly processingClave = signal<string | null>(null);
  protected readonly isCancelling = signal(false);
  /**
   * Asistencia que el veterinario eligio y todavia no confirmo (P1-193).
   *
   * `null` = no hay confirmacion abierta. Los dos botones quedan pegados en el
   * panel, asi que un click equivocado tiene que poder frenarse antes de
   * registrar algo sobre el cliente.
   */
  protected readonly asistenciaPendiente = signal<boolean | null>(null);
  protected readonly motivoCancelacion = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly cargando = computed(
    () => this.isLoading() || this.isLoadingServicios(),
  );

  /** Turnos de ambos origenes normalizados a un unico formato. */
  private readonly todosLosTurnos = computed<EventoTurno[]>(() => [
    ...this.turnos().map((turno) => this.desdeVeterinario(turno)),
    ...this.turnosServicios().map((turno) => this.desdeServicio(turno)),
  ]);

  protected readonly turnosVisibles = computed(() => {
    const estados = this.estadosVisibles();
    const tipos = this.tiposVisibles();
    return this.todosLosTurnos().filter(
      (turno) => estados.includes(turno.estado) && tipos.includes(turno.tipo),
    );
  });

  /** Turnos visibles agrupados por fecha y ordenados por hora. */
  private readonly turnosPorFecha = computed(() => {
    const agrupados = new Map<string, EventoTurno[]>();
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

  /** Capacidad agrupada por fecha y hora, para buscar la franja de cada celda. */
  private readonly capacidadPorFranja = computed(() => {
    const porClave = new Map<string, CapacidadHorario>();
    for (const franja of this.capacidad()) {
      porClave.set(`${franja.fecha}|${franja.hora}`, franja);
    }
    return porClave;
  });

  /** Turnos que todavía se pueden agendar cada día (solo franjas futuras). */
  private readonly libresPorFecha = computed(() => {
    const libres = new Map<string, number>();
    for (const franja of this.capacidad()) {
      const disponibles = franja.cuposAtencion + franja.cuposSobreturno - franja.ocupados;
      if (disponibles > 0 && !this.yaPaso(franja.fecha, franja.hora)) {
        libres.set(franja.fecha, (libres.get(franja.fecha) ?? 0) + disponibles);
      }
    }
    return libres;
  });

  /** Rango de fechas que muestra la vista actual, para pedir su capacidad. */
  private readonly rangoVisible = computed(() => {
    const foco = this.parseClave(this.fechaFoco());
    if (this.vista() === 'dia') {
      return { desde: this.toClave(foco), hasta: this.toClave(foco) };
    }
    if (this.vista() === 'semana') {
      const inicio = this.inicioDeSemana(foco);
      return { desde: this.toClave(inicio), hasta: this.toClave(this.sumarDias(inicio, 6)) };
    }
    const inicio = this.inicioDeSemana(new Date(foco.getFullYear(), foco.getMonth(), 1));
    return { desde: this.toClave(inicio), hasta: this.toClave(this.sumarDias(inicio, 41)) };
  });

  protected readonly turnoSeleccionado = computed(() => {
    const clave = this.turnoSeleccionadoClave();
    return clave === null
      ? null
      : (this.todosLosTurnos().find((turno) => turno.clave === clave) ?? null);
  });

  protected readonly conteoPorEstado = computed(() => {
    const conteo = new Map<EstadoTurno, number>();
    const tipos = this.tiposVisibles();
    for (const turno of this.todosLosTurnos()) {
      if (!tipos.includes(turno.tipo)) {
        continue;
      }
      conteo.set(turno.estado, (conteo.get(turno.estado) ?? 0) + 1);
    }
    return conteo;
  });

  protected readonly conteoPorTipo = computed(() => {
    const conteo = new Map<TipoTurno, number>();
    for (const turno of this.todosLosTurnos()) {
      conteo.set(turno.tipo, (conteo.get(turno.tipo) ?? 0) + 1);
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
    const porFranja = this.capacidadPorFranja();
    const fechas = new Set(dias.map((dia) => dia.fecha));
    const horasConEventos = [
      ...dias.flatMap((dia) => dia.turnos).map((turno) => Number(turno.hora.slice(0, 2))),
      ...this.capacidad()
        .filter((franja) => fechas.has(franja.fecha))
        .map((franja) => Number(franja.hora.slice(0, 2))),
    ];

    const desde = Math.min(HORA_INICIO_POR_DEFECTO, ...horasConEventos);
    const hasta = Math.max(HORA_FIN_POR_DEFECTO, ...horasConEventos);

    const filas: FilaHoraria[] = [];
    for (let hora = desde; hora <= hasta; hora++) {
      const prefijo = String(hora).padStart(2, '0');
      filas.push({
        hora,
        etiqueta: `${prefijo}:00`,
        celdas: dias.map((dia) => {
          const mitades: MitadDeHora[] = [];
          for (const minutos of ['00', '30']) {
            const horaMitad = `${prefijo}:${minutos}`;
            const capacidad = porFranja.get(`${dia.fecha}|${horaMitad}`) ?? null;
            const turnos = dia.turnos.filter(
              (turno) =>
                Number(turno.hora.slice(0, 2)) === hora &&
                (Number(turno.hora.slice(3, 5)) < 30) === (minutos === '00'),
            );
            if (capacidad || turnos.length > 0) {
              mitades.push({
                hora: horaMitad,
                franja: capacidad ? this.aFranjaAgenda(capacidad) : null,
                turnos,
              });
            }
          }
          return { fecha: dia.fecha, mitades };
        }),
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

  constructor() {
    // La capacidad se vuelve a pedir cada vez que cambia el rango que se ve.
    effect(() => {
      const { desde, hasta } = this.rangoVisible();
      this.cargarAgenda(desde, hasta);
    });
  }

  ngOnInit(): void {
    this.loadTurnos();
    this.loadTurnosServicios();
  }

  protected setVista(vista: VistaCalendario): void {
    this.vista.set(vista);
  }

  /**
   * Abre el alta de turno. Con fecha y hora viene de un doble clic sobre un
   * horario; sin ellas, del botón "Nuevo turno".
   */
  protected abrirNuevoTurno(fecha: string | null = null, hora: string | null = null): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.nuevoTurno.set({ fecha, hora });
  }

  protected cerrarNuevoTurno(): void {
    this.nuevoTurno.set(null);
  }

  protected turnoAgendado(turno: TurnoVeterinarioResponse): void {
    this.nuevoTurno.set(null);
    this.fechaFoco.set(turno.fecha);
    this.successMessage.set(
      turno.sobrecupo
        ? 'Turno agendado como sobrecupo. Le avisamos al cliente.'
        : 'Turno agendado. Le avisamos al cliente.',
    );
    this.loadTurnos();
    this.recargarAgenda();
  }

  /** Doble clic en un día del mes (no sobre un turno): agenda ese día. */
  protected dobleClickDia(evento: MouseEvent, fecha: string): void {
    if ((evento.target as HTMLElement).closest('button') || fecha < this.claveDeHoy()) {
      return;
    }
    this.abrirNuevoTurno(fecha);
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

  protected toggleEstado(estado: EstadoTurno): void {
    const visibles = this.estadosVisibles();
    this.estadosVisibles.set(
      visibles.includes(estado)
        ? visibles.filter((value) => value !== estado)
        : [...visibles, estado],
    );
  }

  protected esEstadoVisible(estado: EstadoTurno): boolean {
    return this.estadosVisibles().includes(estado);
  }

  protected toggleTipo(tipo: TipoTurno): void {
    const visibles = this.tiposVisibles();
    this.tiposVisibles.set(
      visibles.includes(tipo)
        ? visibles.filter((value) => value !== tipo)
        : [...visibles, tipo],
    );
  }

  protected esTipoVisible(tipo: TipoTurno): boolean {
    return this.tiposVisibles().includes(tipo);
  }

  protected conteo(estado: EstadoTurno): number {
    return this.conteoPorEstado().get(estado) ?? 0;
  }

  protected conteoTipo(tipo: TipoTurno): number {
    return this.conteoPorTipo().get(tipo) ?? 0;
  }

  protected seleccionarTurno(turno: EventoTurno): void {
    this.turnoSeleccionadoClave.set(turno.clave);
    this.cancelCancelacion();
    this.cancelarConfirmacionAsistencia();
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  protected cerrarPanel(): void {
    this.turnoSeleccionadoClave.set(null);
    this.cancelCancelacion();
  }

  protected startCancelacion(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isCancelling.set(true);
    this.motivoCancelacion.set('');
  }

  protected cancelCancelacion(): void {
    this.isCancelling.set(false);
    this.motivoCancelacion.set('');
  }

  protected cancelar(turno: EventoTurno): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.processingClave.set(turno.clave);

    const motivoCancelacion = this.motivoCancelacion().trim() || undefined;

    const onSuccess = () => {
      this.processingClave.set(null);
      this.cancelCancelacion();
      this.successMessage.set('Turno cancelado correctamente.');
    };
    const onError = (error: ApiError) => {
      this.processingClave.set(null);
      this.errorMessage.set(error.mensaje ?? 'No se pudo cancelar el turno.');
    };

    if (turno.tipo === 'veterinaria') {
      this.turnosService.cancelar(turno.idTurno, { motivoCancelacion }).subscribe({
        next: () => {
          onSuccess();
          this.loadTurnos();
          this.recargarAgenda();
        },
        error: onError,
      });
    } else {
      this.turnosServiciosService.cancelar(turno.idTurno, { motivoCancelacion }).subscribe({
        next: () => {
          onSuccess();
          this.loadTurnosServicios();
        },
        error: onError,
      });
    }
  }

  protected formatDate(value: string): string {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  protected formatTime(value: string): string {
    return value.slice(0, 5);
  }

  /** Nombre corto del día ("Lun", "Mar"...) para una fecha YYYY-MM-DD. */
  protected nombreCortoDia(fecha: string): string {
    return DIAS_SEMANA[this.indiceDesdeLunes(this.parseClave(fecha))];
  }

  /**
   * `true` si el turno ya empezo y sigue sin cerrarse.
   *
   * Es lo que habilita las acciones de asistencia: antes de la hora el cliente
   * todavia esta a tiempo de llegar, y el backend rechaza marcarlo (P1-193).
   */
  protected puedeRegistrarAsistencia(turno: EventoTurno): boolean {
    return (
      turno.tipo === 'veterinaria' &&
      turno.estado === 'confirmado' &&
      new Date(`${turno.fecha}T${turno.hora}`).getTime() <= Date.now()
    );
  }

  /** `true` si el turno ya tiene asistencia registrada. */
  protected tieneAsistencia(turno: EventoTurno): boolean {
    return turno.estado === 'asistio' || turno.estado === 'ausente';
  }

  /** Solo el mismo dia, que es lo unico que acepta el backend. */
  protected puedeCorregirAsistencia(turno: EventoTurno): boolean {
    return this.tieneAsistencia(turno) && turno.fecha === this.claveDeHoy();
  }

  /** Turno pasado que el veterinario todavia no cerro. */
  protected esperaRegistro(turno: EventoTurno): boolean {
    return this.puedeRegistrarAsistencia(turno);
  }

  /** Abre el paso de confirmacion para la opcion elegida. */
  protected pedirConfirmacionAsistencia(asistio: boolean): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.asistenciaPendiente.set(asistio);
  }

  protected cancelarConfirmacionAsistencia(): void {
    this.asistenciaPendiente.set(null);
  }

  protected registrarAsistencia(turno: EventoTurno, asistio: boolean): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.processingClave.set(turno.clave);

    this.turnosService.registrarAsistencia(turno.idTurno, { asistio }).subscribe({
      next: () => {
        this.processingClave.set(null);
        this.cancelarConfirmacionAsistencia();
        this.successMessage.set(
          asistio ? 'Turno marcado como asistido.' : 'Turno marcado como ausente.',
        );
        this.loadTurnos();
      },
      error: (error: ApiError) => {
        this.processingClave.set(null);
        this.cancelarConfirmacionAsistencia();
        this.errorMessage.set(error.mensaje ?? 'No se pudo registrar la asistencia.');
      },
    });
  }

  protected revertirAsistencia(turno: EventoTurno): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.processingClave.set(turno.clave);

    this.turnosService.revertirAsistencia(turno.idTurno).subscribe({
      next: () => {
        this.processingClave.set(null);
        this.successMessage.set('Se deshizo el registro de asistencia.');
        this.loadTurnos();
      },
      error: (error: ApiError) => {
        this.processingClave.set(null);
        this.errorMessage.set(error.mensaje ?? 'No se pudo corregir la asistencia.');
      },
    });
  }

  protected estadoLabel(estado: EstadoTurno): string {
    return this.estados.find((option) => option.value === estado)?.label ?? estado;
  }

  /** Etiqueta en singular para mostrar el estado de un turno puntual. */
  protected estadoLabelSingular(estado: EstadoTurno): string {
    return this.estadoLabel(estado).replace(/s$/, '');
  }

  protected tipoLabel(tipo: TipoTurno): string {
    return this.tipos.find((option) => option.value === tipo)?.label ?? tipo;
  }

  protected categoriaLabel(categoria: string): string {
    switch (categoria) {
      case 'paseador':
        return 'Paseador';
      case 'guarderia':
        return 'Guardería';
      case 'peluqueria':
        return 'Peluquería';
      default:
        return categoria;
    }
  }

  /** Texto corto que acompaña a la hora en el chip del calendario. */
  protected etiquetaCorta(turno: EventoTurno): string {
    return turno.categoria
      ? `${turno.nombreMascota} · ${this.categoriaLabel(turno.categoria)}`
      : turno.nombreMascota;
  }

  protected etiquetaFranja(franja: FranjaAgenda): string {
    if (franja.estado === 'completo') {
      return 'Completo';
    }
    const cupos = franja.libres === 1 ? '1 cupo' : `${franja.libres} cupos`;
    return franja.estado === 'sobreturno' ? `Sobreturno · ${cupos}` : cupos;
  }

  private desdeVeterinario(turno: TurnoVeterinarioResponse): EventoTurno {
    return {
      clave: `veterinaria-${turno.idTurno}`,
      tipo: 'veterinaria',
      idTurno: turno.idTurno,
      fecha: turno.fecha,
      hora: turno.hora,
      horaFin: null,
      estado: turno.estado,
      nombreMascota: turno.nombreMascota,
      nombreDuenio: turno.nombreDuenio,
      emailDuenio: turno.emailDuenio,
      telefonoDuenio: turno.telefonoDuenio,
      categoria: null,
      detalle: turno.motivoConsulta,
      motivoNegativo: turno.motivoCancelacion,
      canceladoPor: turno.canceladoPor,
      veterinario: turno,
      servicio: null,
    };
  }

  private desdeServicio(turno: TurnoServicioResponse): EventoTurno {
    return {
      clave: `servicio-${turno.idTurno}`,
      tipo: 'servicio',
      idTurno: turno.idTurno,
      fecha: turno.fecha,
      hora: turno.horaInicio,
      horaFin: turno.horaFin,
      estado: turno.estado,
      nombreMascota: turno.nombreMascota,
      nombreDuenio: turno.nombreDuenio,
      emailDuenio: turno.emailDuenio,
      telefonoDuenio: turno.telefonoDuenio,
      categoria: turno.categoria,
      detalle: turno.notas,
      motivoNegativo: turno.motivoCancelacion,
      canceladoPor: turno.canceladoPor,
      veterinario: null,
      servicio: turno,
    };
  }

  private loadTurnos(): void {
    this.isLoading.set(true);

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

  private loadTurnosServicios(): void {
    this.isLoadingServicios.set(true);

    this.turnosServiciosService.getRecibidas().subscribe({
      next: (turnos) => {
        this.turnosServicios.set(turnos);
        this.isLoadingServicios.set(false);
      },
      error: (error: ApiError) => {
        this.turnosServicios.set([]);
        this.isLoadingServicios.set(false);
        this.errorMessage.set(
          error.mensaje ?? 'No se pudieron cargar los turnos de servicios.',
        );
      },
    });
  }

  private cargarAgenda(desde: string, hasta: string): void {
    this.turnosService.getAgenda(desde, hasta).subscribe({
      next: (capacidad) => this.capacidad.set(capacidad),
      error: () => this.capacidad.set([]),
    });
  }

  private recargarAgenda(): void {
    const { desde, hasta } = this.rangoVisible();
    this.cargarAgenda(desde, hasta);
  }

  private aFranjaAgenda(capacidad: CapacidadHorario): FranjaAgenda {
    const total = capacidad.cuposAtencion + capacidad.cuposSobreturno;
    const libres = total - capacidad.ocupados;
    return {
      total,
      libres,
      estado: libres <= 0 ? 'completo' : capacidad.cuposAtencion > 0 ? 'libre' : 'sobreturno',
      pasada: this.yaPaso(capacidad.fecha, capacidad.hora),
    };
  }

  private yaPaso(fecha: string, hora: string): boolean {
    return new Date(`${fecha}T${hora}`).getTime() <= Date.now();
  }

  private armarDia(fecha: Date, esDelMesActual: boolean): DiaCalendario {
    const clave = this.toClave(fecha);
    return {
      fecha: clave,
      numero: fecha.getDate(),
      esDelMesActual,
      esHoy: clave === this.claveDeHoy(),
      turnos: this.turnosPorFecha().get(clave) ?? [],
      libres: this.libresPorFecha().get(clave) ?? 0,
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

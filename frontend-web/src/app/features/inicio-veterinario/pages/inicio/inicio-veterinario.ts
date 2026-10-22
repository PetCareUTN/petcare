import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import { NuevoTurnoModalComponent } from '../../../turnos-veterinarios/components/nuevo-turno-modal/nuevo-turno-modal';
import {
  CapacidadHorario,
  TurnoVeterinarioResponse,
} from '../../../turnos-veterinarios/models/turno-veterinario';
import { TurnosVeterinariosService } from '../../../turnos-veterinarios/services/turnos-veterinarios-service';

const DIAS_PROXIMOS = 7;
/** Cuántos pendientes se listan; el resto se ve en Turnos. */
const MAX_PENDIENTES = 6;

@Component({
  selector: 'app-inicio-veterinario',
  imports: [RouterLink, NuevoTurnoModalComponent],
  templateUrl: './inicio-veterinario.html',
  styleUrl: './inicio-veterinario.css',
})
export class InicioVeterinarioPage implements OnInit {
  private readonly turnosService = inject(TurnosVeterinariosService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  private readonly turnos = signal<TurnoVeterinarioResponse[]>([]);
  private readonly capacidadHoy = signal<CapacidadHorario[]>([]);

  protected readonly confirmandoCancelarId = signal<number | null>(null);
  protected readonly asistenciaPendiente = signal<{ idTurno: number; asistio: boolean } | null>(
    null,
  );
  protected readonly procesandoId = signal<number | null>(null);
  protected readonly accionError = signal<string | null>(null);
  protected readonly mostrarNuevoTurno = signal(false);

  /** Turnos de hoy que ocupan la agenda (los cancelados no se muestran). */
  protected readonly turnosHoy = computed(() => {
    const hoy = this.hoyIso();
    return this.turnos()
      .filter((turno) => turno.fecha === hoy && turno.estado !== 'cancelado')
      .sort((a, b) => a.hora.localeCompare(b.hora));
  });

  protected readonly atendidosHoy = computed(
    () => this.turnosHoy().filter((turno) => turno.estado === 'asistio').length,
  );

  /** Huecos de hoy que todavía no pasaron y siguen con cupo. */
  protected readonly libresHoy = computed(() =>
    this.capacidadHoy()
      .filter((franja) => !this.yaEmpezo(franja.fecha, franja.hora))
      .reduce((total, franja) => total + Math.max(franja.cupos - franja.ocupados, 0), 0),
  );

  /** Turnos que ya empezaron y el veterinario no cerró como asistió o no vino. */
  protected readonly sinRegistrar = computed(() =>
    this.turnos()
      .filter((turno) => turno.estado === 'confirmado' && this.yaEmpezo(turno.fecha, turno.hora))
      .sort((a, b) => `${b.fecha}${b.hora}`.localeCompare(`${a.fecha}${a.hora}`)),
  );

  protected readonly pendientes = computed(() => this.sinRegistrar().slice(0, MAX_PENDIENTES));

  protected readonly proximos7Dias = computed(() => {
    const limite = this.sumarDias(this.hoyIso(), DIAS_PROXIMOS - 1);
    return this.turnos().filter(
      (turno) =>
        turno.estado === 'confirmado' &&
        !this.yaEmpezo(turno.fecha, turno.hora) &&
        turno.fecha <= limite,
    ).length;
  });

  /** El primer turno de hoy que todavía no empezó: se resalta en la agenda. */
  protected readonly proximoId = computed(
    () =>
      this.turnosHoy().find(
        (turno) => turno.estado === 'confirmado' && !this.yaEmpezo(turno.fecha, turno.hora),
      )?.idTurno ?? null,
  );

  ngOnInit(): void {
    this.cargar();
  }

  /** Estado para mostrar en la agenda: pendiente de cerrar, próximo, o ya cerrado. */
  protected sinCerrar(turno: TurnoVeterinarioResponse): boolean {
    return turno.estado === 'confirmado' && this.yaEmpezo(turno.fecha, turno.hora);
  }

  protected puedeCancelar(turno: TurnoVeterinarioResponse): boolean {
    return turno.estado === 'confirmado' && !this.yaEmpezo(turno.fecha, turno.hora);
  }

  /** Datos para abrir el evento clínico de la mascota del turno. */
  protected paramsAtencion(turno: TurnoVeterinarioResponse): Record<string, string | number> {
    return {
      idMascota: turno.idMascota,
      selectedPetId: turno.idMascota,
      ownerEmail: turno.emailDuenio,
    };
  }

  protected fechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const nombres = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const dow = new Date(anio, mes - 1, dia).getDay();
    return `${nombres[dow]} ${dia}/${String(mes).padStart(2, '0')}`;
  }

  protected formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  protected pedirCancelacion(idTurno: number): void {
    this.accionError.set(null);
    this.confirmandoCancelarId.set(idTurno);
  }

  protected descartarCancelacion(): void {
    this.confirmandoCancelarId.set(null);
  }

  protected confirmarCancelacion(turno: TurnoVeterinarioResponse): void {
    this.accionError.set(null);
    this.procesandoId.set(turno.idTurno);

    this.turnosService.cancelar(turno.idTurno, {}).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.confirmandoCancelarId.set(null);
        this.recargarTurnos();
      },
      error: (error: ApiError) => {
        this.procesandoId.set(null);
        this.accionError.set(error.mensaje ?? 'No se pudo cancelar el turno.');
      },
    });
  }

  /** Los dos botones quedan juntos: se pide confirmar para que un clic no registre algo de más. */
  protected pedirAsistencia(idTurno: number, asistio: boolean): void {
    this.accionError.set(null);
    this.asistenciaPendiente.set({ idTurno, asistio });
  }

  protected descartarAsistencia(): void {
    this.asistenciaPendiente.set(null);
  }

  protected esAsistenciaPendiente(idTurno: number): boolean {
    return this.asistenciaPendiente()?.idTurno === idTurno;
  }

  protected confirmarAsistencia(turno: TurnoVeterinarioResponse): void {
    const pendiente = this.asistenciaPendiente();
    if (!pendiente || pendiente.idTurno !== turno.idTurno) {
      return;
    }

    this.accionError.set(null);
    this.procesandoId.set(turno.idTurno);

    this.turnosService.registrarAsistencia(turno.idTurno, { asistio: pendiente.asistio }).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.asistenciaPendiente.set(null);
        this.recargarTurnos();
      },
      error: (error: ApiError) => {
        this.procesandoId.set(null);
        this.asistenciaPendiente.set(null);
        this.accionError.set(error.mensaje ?? 'No se pudo registrar la asistencia.');
      },
    });
  }

  protected abrirNuevoTurno(): void {
    this.successMessage.set(null);
    this.mostrarNuevoTurno.set(true);
  }

  protected cerrarNuevoTurno(): void {
    this.mostrarNuevoTurno.set(false);
  }

  protected turnoAgendado(turno: TurnoVeterinarioResponse): void {
    this.mostrarNuevoTurno.set(false);
    this.successMessage.set(
      turno.sobrecupo
        ? 'Sobreturno agregado. Le avisamos al cliente.'
        : 'Turno agendado. Le avisamos al cliente.',
    );
    this.cargar();
  }

  private recargarTurnos(): void {
    this.turnosService.getMine().subscribe({
      next: (turnos) => this.turnos.set(turnos),
      error: (error: ApiError) =>
        this.accionError.set(error.mensaje ?? 'No se pudieron actualizar los turnos.'),
    });
  }

  private cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const hoy = this.hoyIso();

    forkJoin({
      turnos: this.turnosService.getMine(),
      capacidad: this.turnosService.getAgenda(hoy, hoy),
    }).subscribe({
      next: ({ turnos, capacidad }) => {
        this.isLoading.set(false);
        this.turnos.set(turnos);
        this.capacidadHoy.set(capacidad);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar el inicio.');
      },
    });
  }

  private yaEmpezo(fecha: string, hora: string): boolean {
    return new Date(`${fecha}T${hora}`).getTime() <= Date.now();
  }

  private hoyIso(): string {
    return this.toIso(new Date());
  }

  private sumarDias(fechaIso: string, dias: number): string {
    const [anio, mes, dia] = fechaIso.split('-').map(Number);
    return this.toIso(new Date(anio, mes - 1, dia + dias));
  }

  private toIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}

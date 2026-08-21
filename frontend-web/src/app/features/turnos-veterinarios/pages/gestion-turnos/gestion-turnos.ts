import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../../auth/models/user';
import {
  AppointmentStatus,
  TurnoVeterinarioResponse,
} from '../../models/turno-veterinario';
import { TurnosVeterinariosService } from '../../services/turnos-veterinarios-service';

type EstadoOption = { value: AppointmentStatus; label: string };

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

  protected readonly filtroEstado = signal<AppointmentStatus>('pendiente');
  protected readonly turnos = signal<TurnoVeterinarioResponse[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly processingTurnoId = signal<number | null>(null);
  protected readonly rejectTurnoId = signal<number | null>(null);
  protected readonly rejectionReason = signal('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly hasTurnos = computed(() => this.turnos().length > 0);

  ngOnInit(): void {
    this.loadTurnos();
  }

  protected setFiltroEstado(estado: AppointmentStatus): void {
    if (this.filtroEstado() === estado) {
      return;
    }
    this.filtroEstado.set(estado);
    this.cancelReject();
    this.loadTurnos();
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

  protected startReject(turno: TurnoVeterinarioResponse): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.rejectTurnoId.set(turno.idTurno);
    this.rejectionReason.set('');
  }

  protected cancelReject(): void {
    this.rejectTurnoId.set(null);
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

  private loadTurnos(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.turnosService.getMine(this.filtroEstado()).subscribe({
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
}

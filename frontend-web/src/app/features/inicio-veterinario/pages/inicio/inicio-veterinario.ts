import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import { ReportesVeterinariosService } from '../../../reportes-veterinarios/services/reportes-veterinarios-service';
import { TurnoVeterinarioResponse } from '../../../turnos-veterinarios/models/turno-veterinario';
import { TurnosVeterinariosService } from '../../../turnos-veterinarios/services/turnos-veterinarios-service';

@Component({
  selector: 'app-inicio-veterinario',
  imports: [RouterLink],
  templateUrl: './inicio-veterinario.html',
  styleUrl: './inicio-veterinario.css',
})
export class InicioVeterinarioPage implements OnInit {
  private readonly turnosService = inject(TurnosVeterinariosService);
  private readonly reportesService = inject(ReportesVeterinariosService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly turnosHoy = signal<TurnoVeterinarioResponse[]>([]);
  protected readonly cantidadProximos7Dias = signal(0);
  protected readonly tasaCancelacionMes = signal<number | null>(null);

  protected readonly confirmandoCancelarId = signal<number | null>(null);
  protected readonly procesandoId = signal<number | null>(null);
  protected readonly cancelarError = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  protected pedirConfirmacion(idTurno: number): void {
    this.cancelarError.set(null);
    this.confirmandoCancelarId.set(idTurno);
  }

  protected cancelarConfirmacion(): void {
    this.confirmandoCancelarId.set(null);
  }

  protected confirmarCancelacion(turno: TurnoVeterinarioResponse): void {
    this.cancelarError.set(null);
    this.procesandoId.set(turno.idTurno);

    this.turnosService.cancelar(turno.idTurno, {}).subscribe({
      next: () => {
        this.procesandoId.set(null);
        this.confirmandoCancelarId.set(null);
        this.turnosHoy.set(this.turnosHoy().filter((t) => t.idTurno !== turno.idTurno));
      },
      error: (error: ApiError) => {
        this.procesandoId.set(null);
        this.cancelarError.set(error.mensaje ?? 'No se pudo cancelar el turno.');
      },
    });
  }

  private cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      turnos: this.turnosService.getMine('confirmado'),
      reporte: this.reportesService.getDashboard(this.primerDiaDelMes()),
    }).subscribe({
      next: ({ turnos, reporte }) => {
        this.isLoading.set(false);
        const hoy = this.hoyIso();
        const en7Dias = this.sumarDias(hoy, 6);

        this.turnosHoy.set(
          turnos
            .filter((turno) => turno.fecha === hoy)
            .sort((a, b) => a.hora.localeCompare(b.hora)),
        );
        this.cantidadProximos7Dias.set(
          turnos.filter((turno) => turno.fecha >= hoy && turno.fecha <= en7Dias).length,
        );
        this.tasaCancelacionMes.set(reporte.resumen.tasaCancelacion);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudo cargar el inicio.');
      },
    });
  }

  protected formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  private hoyIso(): string {
    return this.toIso(new Date());
  }

  private primerDiaDelMes(): string {
    const hoy = new Date();
    return this.toIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
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

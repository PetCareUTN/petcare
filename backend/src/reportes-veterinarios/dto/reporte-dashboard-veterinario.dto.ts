import { DiaSemana } from '../../common/enums/dia-semana.enum';

export interface TurnosPorMesDto {
  mes: string;
  etiqueta: string;
  confirmados: number;
  cancelados: number;
}

export interface OcupacionPorDiaDto {
  diaSemana: DiaSemana;
  etiqueta: string;
  ocupados: number;
  capacidad: number;
  porcentaje: number;
}

export interface HorarioPicoDto {
  hora: number;
  etiqueta: string;
  cantidad: number;
}

export interface PacientesPorMesDto {
  mes: string;
  etiqueta: string;
  nuevos: number;
  recurrentes: number;
}

export interface ResumenReporteDto {
  totalTurnos: number;
  /** Turnos que ocuparon la agenda: confirmados, asistidos y ausentes. */
  confirmados: number;
  /** Turnos cerrados con el cliente presente (P1-193). */
  asistidos: number;
  /** Turnos cerrados sin que el cliente se presentara (P1-193). */
  ausentes: number;
  /** Turnos ya pasados que el veterinario todavia no cerro. */
  sinRegistrar: number;
  /** Turnos que el veterinario agendo sobre un horario ya completo. */
  sobreturnos: number;
  cancelados: number;
  tasaCancelacion: number;
  /** Ausentes sobre los turnos ya cerrados. */
  tasaAusentismo: number;
  pacientesAtendidos: number;
}

export interface ReporteDashboardVeterinarioDto {
  rangoDesde: string;
  rangoHasta: string;
  resumen: ResumenReporteDto;
  /** Mismo resumen para el período de igual duración inmediatamente anterior. */
  resumenAnterior: ResumenReporteDto;
  turnosPorMes: TurnosPorMesDto[];
  ocupacionPorDia: OcupacionPorDiaDto[];
  horariosPico: HorarioPicoDto[];
  pacientesPorMes: PacientesPorMesDto[];
}

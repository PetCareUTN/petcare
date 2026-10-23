export interface TurnosPorMes {
  mes: string;
  etiqueta: string;
  confirmados: number;
  cancelados: number;
}

export interface OcupacionPorDia {
  diaSemana: string;
  etiqueta: string;
  ocupados: number;
  capacidad: number;
  porcentaje: number;
}

export interface HorarioPico {
  hora: number;
  etiqueta: string;
  cantidad: number;
}

export interface PacientesPorMes {
  mes: string;
  etiqueta: string;
  nuevos: number;
  recurrentes: number;
}

export interface ResumenReporte {
  totalTurnos: number;
  /** Turnos que ocuparon la agenda: confirmados, asistidos y ausentes. */
  confirmados: number;
  asistidos: number;
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

export interface ReporteDashboardVeterinario {
  rangoDesde: string;
  rangoHasta: string;
  resumen: ResumenReporte;
  /** Mismo resumen para el período de igual duración inmediatamente anterior. */
  resumenAnterior: ResumenReporte;
  turnosPorMes: TurnosPorMes[];
  ocupacionPorDia: OcupacionPorDia[];
  horariosPico: HorarioPico[];
  pacientesPorMes: PacientesPorMes[];
}

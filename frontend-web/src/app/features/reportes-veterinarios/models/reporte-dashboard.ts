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
  confirmados: number;
  cancelados: number;
  tasaCancelacion: number;
  pacientesAtendidos: number;
}

export interface ReporteDashboardVeterinario {
  rangoDesde: string;
  rangoHasta: string;
  resumen: ResumenReporte;
  turnosPorMes: TurnosPorMes[];
  ocupacionPorDia: OcupacionPorDia[];
  horariosPico: HorarioPico[];
  pacientesPorMes: PacientesPorMes[];
}

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
  confirmados: number;
  cancelados: number;
  tasaCancelacion: number;
  pacientesAtendidos: number;
}

export interface ReporteDashboardVeterinarioDto {
  rangoDesde: string;
  rangoHasta: string;
  resumen: ResumenReporteDto;
  turnosPorMes: TurnosPorMesDto[];
  ocupacionPorDia: OcupacionPorDiaDto[];
  horariosPico: HorarioPicoDto[];
  pacientesPorMes: PacientesPorMesDto[];
}

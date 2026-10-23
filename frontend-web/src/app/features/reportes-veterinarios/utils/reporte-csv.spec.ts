import { describe, expect, it } from 'vitest';
import { ReporteDashboardVeterinario, ResumenReporte } from '../models/reporte-dashboard';
import { construirCsv, fechaLegible } from './reporte-csv';

function resumen(parcial: Partial<ResumenReporte>): ResumenReporte {
  return {
    totalTurnos: 0,
    confirmados: 0,
    asistidos: 0,
    ausentes: 0,
    sinRegistrar: 0,
    sobreturnos: 0,
    cancelados: 0,
    tasaCancelacion: 0,
    tasaAusentismo: 0,
    pacientesAtendidos: 0,
    ...parcial,
  };
}

const reporte: ReporteDashboardVeterinario = {
  rangoDesde: '2026-05-01',
  rangoHasta: '2026-10-22',
  resumen: resumen({ totalTurnos: 13, cancelados: 1, tasaCancelacion: 7.7 }),
  resumenAnterior: resumen({ totalTurnos: 10, cancelados: 2, tasaCancelacion: 20 }),
  turnosPorMes: [{ mes: '2026-10', etiqueta: 'Oct 2026', confirmados: 5, cancelados: 1 }],
  ocupacionPorDia: [
    { diaSemana: 'lunes', etiqueta: 'Lunes', ocupados: 5, capacidad: 800, porcentaje: 0.6 },
  ] as ReporteDashboardVeterinario['ocupacionPorDia'],
  horariosPico: [{ hora: 10, etiqueta: '10:00', cantidad: 7 }],
  pacientesPorMes: [{ mes: '2026-10', etiqueta: 'Oct 2026', nuevos: 2, recurrentes: 3 }],
};

describe('construirCsv', () => {
  it('compara el resumen con el período anterior', () => {
    const lineas = construirCsv(reporte).split('\r\n');

    expect(lineas).toContain('Resumen;Período actual;Período anterior');
    expect(lineas).toContain('Turnos del período;13;10');
  });

  it('usa coma decimal para que Excel en español lo lea como número', () => {
    const lineas = construirCsv(reporte).split('\r\n');

    expect(lineas).toContain('Tasa de cancelación (%);7,7;20');
    expect(lineas).toContain('Lunes;5;800;0,6');
  });

  it('incluye el detalle de cada gráfico', () => {
    const csv = construirCsv(reporte);

    expect(csv).toContain('Oct 2026;5;1');
    expect(csv).toContain('10:00;7');
    expect(csv).toContain('Oct 2026;2;3');
  });
});

describe('fechaLegible', () => {
  it('pasa de ISO a día/mes/año', () => {
    expect(fechaLegible('2026-10-22')).toBe('22/10/2026');
  });
});

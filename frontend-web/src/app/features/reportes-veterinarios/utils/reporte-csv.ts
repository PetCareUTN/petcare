import { ReporteDashboardVeterinario } from '../models/reporte-dashboard';

/** Separador de columnas que Excel en español abre sin pasos extra. */
const SEPARADOR = ';';

function celda(valor: string | number): string {
  // Decimales con coma, como los espera Excel en español.
  const texto = typeof valor === 'number' ? String(valor).replace('.', ',') : valor;
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

function fila(...valores: (string | number)[]): string {
  return valores.map(celda).join(SEPARADOR);
}

export function fechaLegible(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Arma el CSV del reporte: resumen contra el período anterior y el detalle de cada gráfico. */
export function construirCsv(reporte: ReporteDashboardVeterinario): string {
  const { resumen: r, resumenAnterior: a } = reporte;
  const lineas = [
    fila('Reporte de turnos', `${fechaLegible(reporte.rangoDesde)} al ${fechaLegible(reporte.rangoHasta)}`),
    '',
    fila('Resumen', 'Período actual', 'Período anterior'),
    fila('Turnos del período', r.totalTurnos, a.totalTurnos),
    fila('Confirmados', r.confirmados, a.confirmados),
    fila('Sobreturnos', r.sobreturnos, a.sobreturnos),
    fila('Pacientes atendidos', r.pacientesAtendidos, a.pacientesAtendidos),
    fila('Asistieron', r.asistidos, a.asistidos),
    fila('No se presentaron', r.ausentes, a.ausentes),
    fila('Sin registrar', r.sinRegistrar, a.sinRegistrar),
    fila('Cancelados', r.cancelados, a.cancelados),
    fila('Tasa de cancelación (%)', r.tasaCancelacion, a.tasaCancelacion),
    fila('Tasa de ausentismo (%)', r.tasaAusentismo, a.tasaAusentismo),
    '',
    fila('Turnos por mes', 'Confirmados', 'Cancelados'),
    ...reporte.turnosPorMes.map((m) => fila(m.etiqueta, m.confirmados, m.cancelados)),
    '',
    fila('Ocupación por día', 'Turnos', 'Cupos', 'Ocupación (%)'),
    ...reporte.ocupacionPorDia.map((o) => fila(o.etiqueta, o.ocupados, o.capacidad, o.porcentaje)),
    '',
    fila('Horarios más solicitados', 'Turnos'),
    ...reporte.horariosPico.map((h) => fila(h.etiqueta, h.cantidad)),
    '',
    fila('Pacientes atendidos por mes', 'Nuevos', 'Recurrentes'),
    ...reporte.pacientesPorMes.map((m) => fila(m.etiqueta, m.nuevos, m.recurrentes)),
  ];
  return lineas.join('\r\n');
}

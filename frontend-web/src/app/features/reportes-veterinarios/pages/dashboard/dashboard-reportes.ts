import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../../auth/models/user';
import { BarChartComponent, BarChartSerie } from '../../components/bar-chart/bar-chart';
import {
  PercentBarItem,
  PercentBarListComponent,
} from '../../components/percent-bar-list/percent-bar-list';
import { ReporteDashboardVeterinario } from '../../models/reporte-dashboard';
import { ReportesVeterinariosService } from '../../services/reportes-veterinarios-service';
import { construirCsv, fechaLegible } from '../../utils/reporte-csv';

type RangoMeses = 3 | 6 | 12;
type EstadoKpi = 'kpi-good' | 'kpi-warn' | 'kpi-bad';

interface Comparacion {
  texto: string;
  /** `mejora`, `empeora` o `igual`, según lo que le conviene al veterinario. */
  clase: 'mejora' | 'empeora' | 'igual';
}

@Component({
  selector: 'app-dashboard-reportes',
  imports: [BarChartComponent, PercentBarListComponent],
  templateUrl: './dashboard-reportes.html',
  styleUrl: './dashboard-reportes.css',
})
export class DashboardReportesPage implements OnInit {
  private readonly reportesService = inject(ReportesVeterinariosService);

  protected readonly opcionesRango: { value: RangoMeses; label: string }[] = [
    { value: 3, label: '3 meses' },
    { value: 6, label: '6 meses' },
    { value: 12, label: '12 meses' },
  ];

  protected readonly rangoMeses = signal<RangoMeses>(6);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly data = signal<ReporteDashboardVeterinario | null>(null);

  protected readonly categoriasTurnos = computed(
    () => this.data()?.turnosPorMes.map((m) => m.etiqueta) ?? [],
  );

  protected readonly serieTurnos = computed<BarChartSerie[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return [
      {
        nombre: 'Confirmados',
        color: 'var(--chart-confirmados)',
        valores: data.turnosPorMes.map((m) => m.confirmados),
      },
      {
        nombre: 'Cancelados',
        color: 'var(--chart-cancelados)',
        valores: data.turnosPorMes.map((m) => m.cancelados),
      },
    ];
  });

  protected readonly categoriasPacientes = computed(
    () => this.data()?.pacientesPorMes.map((m) => m.etiqueta) ?? [],
  );

  protected readonly seriePacientes = computed<BarChartSerie[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return [
      {
        nombre: 'Nuevos',
        color: 'var(--chart-nuevos)',
        valores: data.pacientesPorMes.map((m) => m.nuevos),
      },
      {
        nombre: 'Recurrentes',
        color: 'var(--chart-recurrentes)',
        valores: data.pacientesPorMes.map((m) => m.recurrentes),
      },
    ];
  });

  protected readonly categoriasHorarios = computed(
    () => this.data()?.horariosPico.map((h) => h.etiqueta) ?? [],
  );

  protected readonly serieHorarios = computed<BarChartSerie[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return [
      {
        nombre: 'Turnos solicitados',
        color: 'var(--chart-horarios)',
        valores: data.horariosPico.map((h) => h.cantidad),
      },
    ];
  });

  /**
   * La barra compara los días entre sí (el más ocupado llena la barra): el
   * porcentaje sobre toda la capacidad del período es tan chico que no deja ver
   * cuál es el día fuerte. La capacidad queda como dato aparte.
   */
  protected readonly itemsOcupacion = computed<PercentBarItem[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    const maximo = Math.max(...data.ocupacionPorDia.map((o) => o.ocupados), 0);
    return data.ocupacionPorDia.map((o) => ({
      etiqueta: o.etiqueta,
      porcentaje: maximo > 0 ? Math.round((o.ocupados / maximo) * 100) : 0,
      valor: o.ocupados === 1 ? '1 turno' : `${o.ocupados} turnos`,
      detalle: `${o.porcentaje}% de ${o.capacidad} cupos`,
    }));
  });

  protected readonly estadoTasaCancelacion = computed<EstadoKpi>(() => {
    const tasa = this.data()?.resumen.tasaCancelacion ?? 0;
    if (tasa <= 10) {
      return 'kpi-good';
    }
    if (tasa <= 25) {
      return 'kpi-warn';
    }
    return 'kpi-bad';
  });

  /**
   * Umbrales propios: un 15% de ausentismo ya es alto para una agenda con
   * cupos limitados, bastante antes de lo que preocuparia una cancelacion,
   * porque el ausente no libera el turno para otro paciente (P1-193).
   */
  protected readonly estadoTasaAusentismo = computed<EstadoKpi>(() => {
    const tasa = this.data()?.resumen.tasaAusentismo ?? 0;
    if (tasa <= 5) {
      return 'kpi-good';
    }
    if (tasa <= 15) {
      return 'kpi-warn';
    }
    return 'kpi-bad';
  });

  /**
   * Diferencia contra el período anterior de igual duración. Sin turnos en ese
   * período no hay con qué comparar, así que no se muestra nada.
   */
  protected readonly comparaciones = computed(() => {
    const data = this.data();
    if (!data || data.resumenAnterior.totalTurnos === 0) {
      return null;
    }
    const { resumen: r, resumenAnterior: a } = data;
    return {
      turnos: this.comparar(r.totalTurnos, a.totalTurnos, null, ''),
      pacientes: this.comparar(r.pacientesAtendidos, a.pacientesAtendidos, true, ''),
      cancelacion: this.comparar(r.tasaCancelacion, a.tasaCancelacion, false, ' pts'),
      ausentismo: this.comparar(r.tasaAusentismo, a.tasaAusentismo, false, ' pts'),
    };
  });

  protected readonly periodoImpreso = computed(() => {
    const data = this.data();
    return data ? `${fechaLegible(data.rangoDesde)} al ${fechaLegible(data.rangoHasta)}` : '';
  });

  protected exportarCsv(): void {
    const data = this.data();
    if (!data) {
      return;
    }
    // El BOM hace que Excel abra el archivo en UTF-8 y respete las tildes.
    const blob = new Blob(['\uFEFF', construirCsv(data)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `reporte-turnos-${data.rangoDesde}-${data.rangoHasta}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  /** El PDF se guarda desde el diálogo de impresión; la hoja de impresión deja solo el reporte. */
  protected exportarPdf(): void {
    window.print();
  }

  ngOnInit(): void {
    this.cargar();
  }

  protected setRango(rango: RangoMeses): void {
    if (this.rangoMeses() === rango) {
      return;
    }
    this.rangoMeses.set(rango);
    this.cargar();
  }

  private cargar(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.reportesService.getDashboard(this.calcularDesde(this.rangoMeses())).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.data.set(data);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar los reportes.');
      },
    });
  }

  /** `mejorSiSube`: true si subir es bueno, false si es malo, null si no es ni bueno ni malo. */
  private comparar(
    actual: number,
    anterior: number,
    mejorSiSube: boolean | null,
    unidad: string,
  ): Comparacion {
    const diferencia = Math.round((actual - anterior) * 10) / 10;
    if (diferencia === 0) {
      return { texto: 'Igual que el período anterior', clase: 'igual' };
    }
    const signo = diferencia > 0 ? '▲' : '▼';
    const valor = String(Math.abs(diferencia)).replace('.', ',');
    const clase =
      mejorSiSube === null ? 'igual' : diferencia > 0 === mejorSiSube ? 'mejora' : 'empeora';
    return { texto: `${signo} ${valor}${unidad} vs. período anterior`, clase };
  }

  private calcularDesde(meses: RangoMeses): string {
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1);
    return `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../../auth/models/user';
import { BarChartComponent, BarChartSerie } from '../../components/bar-chart/bar-chart';
import {
  PercentBarItem,
  PercentBarListComponent,
} from '../../components/percent-bar-list/percent-bar-list';
import { ReporteDashboardVeterinario } from '../../models/reporte-dashboard';
import { ReportesVeterinariosService } from '../../services/reportes-veterinarios-service';

type RangoMeses = 3 | 6 | 12;
type EstadoKpi = 'kpi-good' | 'kpi-warn' | 'kpi-bad';

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

  protected readonly itemsOcupacion = computed<PercentBarItem[]>(() => {
    const data = this.data();
    if (!data) {
      return [];
    }
    return data.ocupacionPorDia.map((o) => ({
      etiqueta: o.etiqueta,
      porcentaje: o.porcentaje,
      detalle: `${o.ocupados}/${o.capacidad} turnos`,
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

  private calcularDesde(meses: RangoMeses): string {
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 1), 1);
    return `${desde.getFullYear()}-${String(desde.getMonth() + 1).padStart(2, '0')}-01`;
  }
}

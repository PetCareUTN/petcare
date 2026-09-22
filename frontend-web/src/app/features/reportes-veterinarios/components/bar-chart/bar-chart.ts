import { Component, computed, input } from '@angular/core';

export interface BarChartSerie {
  nombre: string;
  color: string;
  valores: number[];
}

type ModoBarChart = 'agrupado' | 'apilado';

interface BarraSegmento {
  serie: string;
  color: string;
  valor: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ColumnaChart {
  categoria: string;
  segmentos: BarraSegmento[];
  total: number;
}

const ALTO = 220;
const PADDING_IZQUIERDO = 36;
const PADDING_INFERIOR = 28;
const PADDING_SUPERIOR = 12;
const CANTIDAD_LINEAS_GRILLA = 4;

/**
 * Gráfico de barras SVG sin dependencias externas: soporta múltiples series
 * agrupadas (una al lado de la otra) o apiladas (una sobre otra), pensado
 * para reportes con pocas categorías (meses, horas).
 */
@Component({
  selector: 'app-bar-chart',
  imports: [],
  templateUrl: './bar-chart.html',
  styleUrl: './bar-chart.css',
})
export class BarChartComponent {
  readonly categorias = input.required<string[]>();
  readonly series = input.required<BarChartSerie[]>();
  readonly modo = input<ModoBarChart>('agrupado');
  readonly ancho = input(560);
  readonly sufijo = input('');

  protected readonly alto = ALTO;

  private readonly valorMaximo = computed(() => {
    const series = this.series();
    if (this.modo() === 'apilado') {
      const totales = this.categorias().map((_, i) =>
        series.reduce((suma, serie) => suma + (serie.valores[i] ?? 0), 0),
      );
      return Math.max(1, ...totales);
    }
    return Math.max(1, ...series.flatMap((serie) => serie.valores));
  });

  protected readonly lineasGrilla = computed(() => {
    const max = this.techoLindo(this.valorMaximo());
    const lineas: { y: number; valor: number }[] = [];
    for (let i = 0; i <= CANTIDAD_LINEAS_GRILLA; i++) {
      const valor = (max / CANTIDAD_LINEAS_GRILLA) * i;
      lineas.push({ y: this.escalarY(valor, max), valor: Math.round(valor) });
    }
    return lineas;
  });

  protected readonly columnas = computed<ColumnaChart[]>(() => {
    const categorias = this.categorias();
    const series = this.series();
    const modo = this.modo();
    const max = this.techoLindo(this.valorMaximo());
    const anchoUtil = this.ancho() - PADDING_IZQUIERDO - 8;
    const anchoColumna = anchoUtil / Math.max(1, categorias.length);
    const gapColumna = anchoColumna * 0.28;
    const anchoDisponible = anchoColumna - gapColumna;

    return categorias.map((categoria, indice) => {
      const segmentos: BarraSegmento[] = [];

      if (modo === 'apilado') {
        let acumulado = 0;
        for (const serie of series) {
          const valor = serie.valores[indice] ?? 0;
          const yBase = this.escalarY(acumulado, max);
          const yTope = this.escalarY(acumulado + valor, max);
          segmentos.push({
            serie: serie.nombre,
            color: serie.color,
            valor,
            x: PADDING_IZQUIERDO + indice * anchoColumna + gapColumna / 2,
            y: yTope,
            width: anchoDisponible,
            height: Math.max(0, yBase - yTope),
          });
          acumulado += valor;
        }
      } else {
        const anchoBarra = anchoDisponible / Math.max(1, series.length);
        series.forEach((serie, indiceSerie) => {
          const valor = serie.valores[indice] ?? 0;
          const yTope = this.escalarY(valor, max);
          const yBase = this.escalarY(0, max);
          segmentos.push({
            serie: serie.nombre,
            color: serie.color,
            valor,
            x: PADDING_IZQUIERDO + indice * anchoColumna + gapColumna / 2 + indiceSerie * anchoBarra,
            y: yTope,
            width: Math.max(0, anchoBarra - 3),
            height: Math.max(0, yBase - yTope),
          });
        });
      }

      return {
        categoria,
        segmentos,
        total: segmentos.reduce((suma, segmento) => suma + segmento.valor, 0),
      };
    });
  });

  protected xCategoria(indice: number): number {
    const anchoUtil = this.ancho() - PADDING_IZQUIERDO - 8;
    const anchoColumna = anchoUtil / Math.max(1, this.categorias().length);
    return PADDING_IZQUIERDO + indice * anchoColumna + anchoColumna / 2;
  }

  private escalarY(valor: number, max: number): number {
    const altoUtil = ALTO - PADDING_SUPERIOR - PADDING_INFERIOR;
    const proporcion = max === 0 ? 0 : valor / max;
    return ALTO - PADDING_INFERIOR - proporcion * altoUtil;
  }

  /** Redondea el techo de la grilla a un número "lindo" (10, 20, 50, 100...) para que las líneas no queden con decimales feos. */
  private techoLindo(valor: number): number {
    if (valor <= 4) {
      return 4;
    }
    const potencia = Math.pow(10, Math.floor(Math.log10(valor)));
    const pasos = [1, 2, 2.5, 5, 10];
    for (const paso of pasos) {
      const techo = paso * potencia;
      if (techo >= valor) {
        return techo;
      }
    }
    return valor;
  }
}

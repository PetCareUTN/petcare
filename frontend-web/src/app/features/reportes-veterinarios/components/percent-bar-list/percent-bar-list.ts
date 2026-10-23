import { Component, input } from '@angular/core';

export interface PercentBarItem {
  etiqueta: string;
  /** Largo de la barra (0-100). */
  porcentaje: number;
  /** Texto de la derecha; si falta, se muestra el porcentaje. */
  valor?: string;
  detalle?: string;
}

/** Lista de barras horizontales de progreso (0-100%), para comparar categorías de un vistazo. */
@Component({
  selector: 'app-percent-bar-list',
  imports: [],
  templateUrl: './percent-bar-list.html',
  styleUrl: './percent-bar-list.css',
})
export class PercentBarListComponent {
  readonly items = input.required<PercentBarItem[]>();
  readonly color = input('var(--primary)');
}

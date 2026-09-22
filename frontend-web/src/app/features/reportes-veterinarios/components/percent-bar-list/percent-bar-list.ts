import { Component, input } from '@angular/core';

export interface PercentBarItem {
  etiqueta: string;
  porcentaje: number;
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

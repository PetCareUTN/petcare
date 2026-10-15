import { Component, OnDestroy, OnInit, output, signal } from '@angular/core';

/*
 * Pantalla de bienvenida que se muestra una sola vez al abrir la app.
 * Anima el logo y el nombre, y despues se desvanece para dejar ver
 * la pantalla que corresponda (normalmente el login).
 */
@Component({
  selector: 'app-splash',
  standalone: true,
  templateUrl: './splash.html',
  styleUrl: './splash.css',
})
export class SplashComponent implements OnInit, OnDestroy {
  /** Se emite cuando termino la animacion y la splash ya puede desmontarse. */
  readonly finished = output<void>();

  /** Dispara la animacion de salida (fade out) antes de desmontar. */
  protected readonly isLeaving = signal(false);

  private readonly timeouts: ReturnType<typeof setTimeout>[] = [];

  ngOnInit(): void {
    // Si la persona pidio menos animaciones, mostramos el logo un instante y salimos.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const holdMs = prefersReducedMotion ? 600 : 2000;

    this.timeouts.push(
      setTimeout(() => this.isLeaving.set(true), holdMs),
      setTimeout(() => this.finished.emit(), holdMs + 500),
    );
  }

  ngOnDestroy(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
  }
}

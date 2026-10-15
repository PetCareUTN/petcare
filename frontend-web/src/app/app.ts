import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplashComponent } from './shared/components/splash/splash';

const SPLASH_KEY = 'petcare_splash_vista';

/*
 * En modo incognito o con el almacenamiento bloqueado, sessionStorage tira
 * excepcion: en ese caso preferimos mostrar la splash antes que romper.
 */
function yaSeMostroLaSplash(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === 'true';
  } catch {
    return false;
  }
}

function marcarSplashComoVista(): void {
  try {
    sessionStorage.setItem(SPLASH_KEY, 'true');
  } catch {
    // No poder recordarlo solo significa que la splash se vuelve a ver al recargar.
  }
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SplashComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  /*
   * La splash se muestra al abrir la app. Queda marcada en sessionStorage para
   * que no vuelva a aparecer al recargar una pestania que ya estaba abierta.
   */
  protected readonly showSplash = signal(!yaSeMostroLaSplash());

  protected onSplashFinished(): void {
    this.showSplash.set(false);
    marcarSplashComoVista();
  }
}

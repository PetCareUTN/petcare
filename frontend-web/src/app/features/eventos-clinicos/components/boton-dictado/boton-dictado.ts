import { Component, inject, input, output } from '@angular/core';
import { DictadoPorVozService } from '../../../../shared/services/dictado-por-voz-service';

/**
 * Micrófono de un campo puntual del evento clínico (P1-182). Cada frase
 * dictada se emite en `texto` y el formulario la agrega al final del campo.
 *
 * Usa el DictadoPorVozService de la página, así que solo un campo (o el
 * asistente) puede estar grabando a la vez.
 */
@Component({
  selector: 'app-boton-dictado',
  templateUrl: './boton-dictado.html',
  styleUrl: './boton-dictado.css',
})
export class BotonDictadoComponent {
  protected readonly dictado = inject(DictadoPorVozService);

  /** Identifica el campo, por ejemplo 'diagnostico'. */
  readonly campo = input.required<string>();
  /** Nombre legible del campo, para lectores de pantalla. */
  readonly etiqueta = input.required<string>();
  readonly texto = output<string>();

  protected alternar(): void {
    if (this.dictado.estaGrabando(this.campo())) {
      this.dictado.detener();
      return;
    }
    this.dictado.iniciar(this.campo(), (texto) => this.texto.emit(texto));
  }
}

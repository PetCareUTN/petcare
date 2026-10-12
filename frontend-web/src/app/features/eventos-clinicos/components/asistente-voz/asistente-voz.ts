import { Component, inject, output, signal } from '@angular/core';
import { ApiError } from '../../../auth/models/user';
import { DictadoPorVozService } from '../../../../shared/services/dictado-por-voz-service';
import { SugerenciaEventoClinico } from '../../models/evento-clinico';
import { EventosClinicosService } from '../../services/eventos-clinicos-service';

const ORIGEN = 'consulta';

/**
 * Asistente de voz del evento clínico (P1-182): la veterinaria dicta la
 * consulta completa, puede corregir la transcripción y el backend la ordena
 * en campos. La sugerencia se emite en `sugerencia` y el formulario la
 * vuelca; nunca se guarda nada desde acá.
 *
 * Usa el DictadoPorVozService de la página, compartido con los micrófonos
 * de cada campo.
 */
@Component({
  selector: 'app-asistente-voz',
  templateUrl: './asistente-voz.html',
  styleUrl: './asistente-voz.css',
})
export class AsistenteVozComponent {
  protected readonly dictado = inject(DictadoPorVozService);
  private readonly eventosClinicosService = inject(EventosClinicosService);

  readonly sugerencia = output<SugerenciaEventoClinico>();

  protected readonly origen = ORIGEN;
  protected readonly transcripcion = signal('');
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aplicado = signal(false);

  /** Vuelve al estado inicial, por ejemplo después de guardar el evento. */
  reiniciar(): void {
    if (this.dictado.estaGrabando(ORIGEN)) {
      this.dictado.detener();
    }
    this.transcripcion.set('');
    this.error.set(null);
    this.aplicado.set(false);
  }

  protected iniciar(): void {
    this.error.set(null);
    this.aplicado.set(false);
    this.dictado.iniciar(ORIGEN, (texto) =>
      this.transcripcion.update((actual) => (actual ? `${actual} ${texto}` : texto)),
    );
  }

  protected detener(): void {
    this.dictado.detener();
  }

  protected descartar(): void {
    this.reiniciar();
  }

  protected completar(): void {
    const transcripcion = this.transcripcion().trim();
    if (!transcripcion || this.procesando()) {
      return;
    }

    this.dictado.detener();
    this.error.set(null);
    this.procesando.set(true);

    this.eventosClinicosService.sugerirCampos(transcripcion).subscribe({
      next: (sugerencia) => {
        this.procesando.set(false);
        this.transcripcion.set('');
        this.aplicado.set(true);
        this.sugerencia.emit(sugerencia);
      },
      error: (error: ApiError) => {
        this.procesando.set(false);
        this.error.set(
          error.mensaje ?? 'No se pudo usar el asistente. Completá el formulario manualmente.',
        );
      },
    });
  }
}

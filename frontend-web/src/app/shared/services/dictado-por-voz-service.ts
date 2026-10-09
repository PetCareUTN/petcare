import { Injectable, OnDestroy, signal } from '@angular/core';

/*
 * La Web Speech API no está en los tipos de TypeScript (lib.dom), así que se
 * declara solo lo que se usa. Chrome y Edge la exponen con prefijo webkit.
 */
interface ResultadoReconocimiento {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface EventoResultado {
  readonly resultIndex: number;
  readonly results: ArrayLike<ResultadoReconocimiento>;
}

interface Reconocimiento {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evento: EventoResultado) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type ConstructorReconocimiento = new () => Reconocimiento;

const MENSAJES_DE_ERROR: Record<string, string> = {
  'not-allowed':
    'No hay permiso para usar el micrófono. Habilitalo en el navegador o completá el campo con el teclado.',
  'service-not-allowed':
    'No hay permiso para usar el micrófono. Habilitalo en el navegador o completá el campo con el teclado.',
  'audio-capture': 'No se encontró un micrófono conectado.',
  network: 'El dictado necesita conexión a internet. Probá de nuevo en un momento.',
};

/**
 * Dictado por voz en español con la Web Speech API del navegador (P1-182).
 *
 * Se provee a nivel de componente: cada pantalla tiene su propio dictado y
 * solo uno puede estar grabando a la vez. Nunca guarda nada por sí mismo:
 * entrega el texto reconocido y quien lo usa decide dónde volcarlo.
 */
@Injectable()
export class DictadoPorVozService implements OnDestroy {
  private readonly constructorReconocimiento = obtenerConstructor();

  /** false en navegadores sin Web Speech API (por ejemplo Firefox). */
  readonly soportado = this.constructorReconocimiento !== null;
  readonly grabando = signal(false);
  /** Lo que se está reconociendo y todavía puede cambiar (no es definitivo). */
  readonly textoParcial = signal('');
  readonly error = signal<string | null>(null);
  /**
   * Quién inició el último dictado (por ejemplo 'consulta' o el nombre de un
   * campo). Sirve para mostrar el indicador y los errores solo en ese lugar.
   */
  readonly origen = signal<string | null>(null);

  private reconocimiento: Reconocimiento | null = null;
  private detenidoManualmente = false;

  estaGrabando(origen: string): boolean {
    return this.grabando() && this.origen() === origen;
  }

  /** Error del último dictado, solo si lo inició `origen`. */
  errorDe(origen: string): string | null {
    return this.origen() === origen ? this.error() : null;
  }

  /**
   * Empieza a grabar. Cada frase reconocida en firme se entrega a
   * `alRecibirTexto`. Si ya había un dictado en curso, lo corta primero.
   */
  iniciar(origen: string, alRecibirTexto: (texto: string) => void): void {
    this.origen.set(origen);
    this.error.set(null);
    if (!this.constructorReconocimiento) {
      this.error.set(
        'Tu navegador no permite dictar por voz. Usá Chrome o Edge, o completá el campo con el teclado.',
      );
      return;
    }

    this.detener();
    this.detenidoManualmente = false;

    const reconocimiento = new this.constructorReconocimiento();
    reconocimiento.lang = 'es-AR';
    reconocimiento.continuous = true;
    reconocimiento.interimResults = true;

    reconocimiento.onresult = (evento) => {
      let parcial = '';
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const resultado = evento.results[i];
        const texto = resultado[0].transcript.trim();
        if (!texto) continue;
        if (resultado.isFinal) {
          alRecibirTexto(texto);
        } else {
          parcial += `${texto} `;
        }
      }
      if (this.reconocimiento === reconocimiento) {
        this.textoParcial.set(parcial.trim());
      }
    };

    reconocimiento.onerror = (evento) => {
      // 'no-speech' y 'aborted' son normales (silencio, o se detuvo a mano):
      // el dictado sigue o termina sin mostrar error.
      if (evento.error === 'no-speech' || evento.error === 'aborted') return;
      this.error.set(
        MENSAJES_DE_ERROR[evento.error] ?? 'No se pudo completar el dictado. Probá de nuevo.',
      );
      this.detenidoManualmente = true;
    };

    reconocimiento.onend = () => {
      // Chrome corta la grabación sola después de un rato de silencio. Si la
      // veterinaria no la detuvo, se reanuda para que siga dictando.
      if (!this.detenidoManualmente && this.reconocimiento === reconocimiento) {
        try {
          reconocimiento.start();
          return;
        } catch {
          // Si no se puede reanudar, se da por terminado.
        }
      }
      if (this.reconocimiento === reconocimiento) {
        this.reconocimiento = null;
        this.grabando.set(false);
        this.textoParcial.set('');
      }
    };

    this.reconocimiento = reconocimiento;
    try {
      reconocimiento.start();
      this.grabando.set(true);
    } catch {
      this.reconocimiento = null;
      this.error.set('No se pudo iniciar el dictado. Probá de nuevo.');
    }
  }

  /** Deja de grabar. Lo que ya se reconoció en firme se entrega igual. */
  detener(): void {
    this.detenidoManualmente = true;
    this.reconocimiento?.stop();
    this.grabando.set(false);
    this.textoParcial.set('');
  }

  ngOnDestroy(): void {
    this.detenidoManualmente = true;
    this.reconocimiento?.abort();
    this.reconocimiento = null;
  }
}

function obtenerConstructor(): ConstructorReconocimiento | null {
  if (typeof window === 'undefined') return null;
  const ventana = window as unknown as {
    SpeechRecognition?: ConstructorReconocimiento;
    webkitSpeechRecognition?: ConstructorReconocimiento;
  };
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition ?? null;
}

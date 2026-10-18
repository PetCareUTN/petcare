import { Component, OnDestroy, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { PagoResponse, SuscripcionResponse } from '../../models/suscripcion';
import { SuscripcionesService } from '../../services/suscripciones-service';

/** Marca en sessionStorage de "volví del checkout de MP" (sobrevive al reload). */
const CLAVE_RETORNO_MP = 'petcare:mp:retorno';
const INTERVALO_POLLING_MS = 5000;
const MAX_INTENTOS_POLLING = 12;

@Component({
  selector: 'app-mi-suscripcion',
  imports: [DatePipe, CurrencyPipe],
  templateUrl: './mi-suscripcion.html',
  styleUrl: './mi-suscripcion.css',
})
export class MiSuscripcionPage implements OnInit, OnDestroy {
  private readonly suscripcionesService = inject(SuscripcionesService);
  private readonly authService = inject(AuthService);

  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private pollingIntentos = 0;

  protected readonly isLoading = signal(true);
  protected readonly isPaying = signal(false);
  protected readonly isCancelling = signal(false);
  protected readonly confirmandoCancelacion = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly suscripcion = signal<SuscripcionResponse | null>(null);
  protected readonly pagos = signal<PagoResponse[]>([]);

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }
    this.cargar();
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  protected pagar(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isPaying.set(true);

    this.suscripcionesService.suscribirme().subscribe({
      next: ({ initPoint }) => {
        // Así, al volver del checkout (recarga completa de la app), sé que
        // tengo que empezar a verificar el pago.
        sessionStorage.setItem(CLAVE_RETORNO_MP, '1');
        // Redirige al checkout de Mercado Pago (entorno test con tarjetas test).
        window.location.href = initPoint;
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isPaying.set(false);
      },
    });
  }

  protected getEstadoClass(estado: string): string {
    switch (estado) {
      case 'en_prueba':
        return 'estado-en_prueba';
      case 'activa':
        return 'estado-activa';
      case 'vencida':
        return 'estado-vencida';
      case 'suspendida':
        return 'estado-suspendida';
      case 'cancelada':
        return 'estado-cancelada';
      default:
        return 'estado-pendiente';
    }
  }

  protected getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'pendiente_pago':
        return 'Pendiente de pago';
      case 'en_prueba':
        return 'En prueba';
      case 'activa':
        return 'Activa';
      case 'vencida':
        return 'Vencida';
      case 'suspendida':
        return 'Suspendida';
      case 'cancelada':
        return 'Cancelada';
      default:
        return estado;
    }
  }

  /** Aviso principal según el estado y si el acceso está permitido. */
  protected getAviso(sub: SuscripcionResponse): string {
    if (sub.codigoBloqueo === 'CUENTA_NO_APROBADA') {
      return (
        sub.motivoBloqueo ??
        'Tu cuenta de veterinario todavía no fue aprobada por un administrador.'
      );
    }
    switch (sub.estado) {
      case 'pendiente_pago':
        return 'Completá el pago para activar tu suscripción y usar la plataforma.';
      case 'en_prueba':
        return sub.esPrueba
          ? 'Estás usando la plataforma gratis durante tu período de prueba. Cuando termine, vas a poder activar tu suscripción desde acá.'
          : 'Tu período de prueba terminó. Suscribite desde acá para usar la plataforma.';
      case 'vencida':
        return sub.accesoPermitido
          ? 'Tu suscripción venció y estás en el período de gracia. Regularizá el pago para no perder el acceso.'
          : 'Terminó el período de gracia. Regularizá el pago para recuperar el acceso.';
      case 'suspendida':
        return (
          sub.motivoBloqueo ??
          'Tu suscripción fue suspendida. Regularizá tu pago para volver a tener acceso.'
        );
      case 'cancelada':
        return (
          sub.motivoBloqueo ?? 'Tu suscripción fue cancelada. Suscribite de nuevo para continuar.'
        );
      default:
        return '';
    }
  }

  /** True si corresponde mostrar el botón de pago. */
  protected puedePagar(sub: SuscripcionResponse): boolean {
    if (sub.codigoBloqueo === 'CUENTA_NO_APROBADA') {
      return false;
    }
    // Durante el trial no hay nada que pagar todavía.
    return sub.estado !== 'activa' && sub.estado !== 'en_prueba';
  }

  /**
   * Estados que se pueden cancelar desde esta pantalla: todos salvo
   * PENDIENTE_PAGO (nunca pagó) y CANCELADA (ya cancelada).
   */
  protected puedeCancelar(sub: SuscripcionResponse): boolean {
    return (
      sub.estado === 'en_prueba' ||
      sub.estado === 'activa' ||
      sub.estado === 'vencida' ||
      sub.estado === 'suspendida'
    );
  }

  /** Días que faltan para el fin del trial, o null si no está en prueba. */
  protected diasRestantesPrueba(sub: SuscripcionResponse): number | null {
    if (sub.estado !== 'en_prueba' || !sub.fechaPruebaFin) {
      return null;
    }
    const restantes = Math.ceil(
      (new Date(sub.fechaPruebaFin).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    );
    return restantes > 0 ? restantes : null;
  }

  /** Cancela la suscripción (primero en Mercado Pago, si tiene preapproval). */
  protected cancelar(): void {
    const sub = this.suscripcion();
    if (!sub || !this.puedeCancelar(sub) || this.isCancelling()) {
      return;
    }

    // Primer click: muestra la confirmación inline.
    if (!this.confirmandoCancelacion()) {
      this.confirmandoCancelacion.set(true);
      return;
    }

    // Segundo click: ejecuta la cancelación real.
    this.confirmandoCancelacion.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isCancelling.set(true);

    this.suscripcionesService.cancelar().subscribe({
      next: (suscripcion) => {
        this.suscripcion.set(suscripcion);
        this.isCancelling.set(false);
        this.successMessage.set('Tu suscripción fue cancelada.');
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isCancelling.set(false);
      },
    });
  }

  private cargar(): void {
    this.suscripcionesService.miSuscripcion().subscribe({
      next: (suscripcion) => {
        this.suscripcion.set(suscripcion);
        this.isLoading.set(false);
        this.cargarHistorial();

        const vuelveDeMp = sessionStorage.getItem(CLAVE_RETORNO_MP) === '1';
        if (vuelveDeMp) {
          sessionStorage.removeItem(CLAVE_RETORNO_MP);
          if (suscripcion.estado !== 'activa') {
            this.iniciarPolling();
          } else {
            this.successMessage.set('Pago confirmado. Tu suscripción está activa.');
          }
        }
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Espera la confirmación del pago consultando solo el estado del backend
   * (que a su vez verifica con MP). Nunca activa nada por su cuenta.
   */
  private iniciarPolling(): void {
    this.detenerPolling();
    this.pollingIntentos = 0;
    this.successMessage.set('Estamos verificando tu pago con Mercado Pago...');

    this.pollingTimer = setInterval(() => {
      this.pollingIntentos += 1;
      if (this.pollingIntentos > MAX_INTENTOS_POLLING) {
        this.detenerPolling();
        this.successMessage.set(
          'Todavía no pudimos confirmar el pago. Volvé a abrir la página en unos minutos.',
        );
        return;
      }

      this.suscripcionesService.miSuscripcion().subscribe({
        next: (suscripcion) => {
          this.suscripcion.set(suscripcion);
          if (suscripcion.estado === 'activa') {
            this.detenerPolling();
            this.successMessage.set('Pago confirmado. Tu suscripción está activa.');
            this.cargarHistorial();
          }
        },
        error: () => {
          // Reintenta en el próximo tick.
        },
      });
    }, INTERVALO_POLLING_MS);
  }

  private detenerPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private cargarHistorial(): void {
    this.suscripcionesService.historial().subscribe({
      next: (pagos) => this.pagos.set(pagos),
      error: () => {
        // El historial es secundario: no bloquea la pantalla.
      },
    });
  }
}

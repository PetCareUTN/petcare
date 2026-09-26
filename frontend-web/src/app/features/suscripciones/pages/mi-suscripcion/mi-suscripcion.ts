import { Component, OnDestroy, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { NotificationBellComponent } from '../../../notificaciones/components/notification-bell/notification-bell';
import { PagoResponse, SuscripcionResponse } from '../../models/suscripcion';
import { SuscripcionesService } from '../../services/suscripciones-service';

/** Marca en sessionStorage de "volví del checkout de MP" (sobrevive al reload). */
const CLAVE_RETORNO_MP = 'petcare:mp:retorno';
const INTERVALO_POLLING_MS = 5000;
const MAX_INTENTOS_POLLING = 12;

@Component({
  selector: 'app-mi-suscripcion',
  imports: [RouterLink, DatePipe, CurrencyPipe, NotificationBellComponent],
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
      case 'ACTIVA':
        return 'estado-activa';
      case 'VENCIDA':
        return 'estado-vencida';
      case 'SUSPENDIDA':
        return 'estado-suspendida';
      case 'CANCELADA':
        return 'estado-cancelada';
      default:
        return 'estado-pendiente';
    }
  }

  protected getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'PENDIENTE_PAGO':
        return 'Pendiente de pago';
      case 'ACTIVA':
        return 'Activa';
      case 'VENCIDA':
        return 'Vencida';
      case 'SUSPENDIDA':
        return 'Suspendida';
      case 'CANCELADA':
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
      case 'PENDIENTE_PAGO':
        return 'Completá el pago para activar tu suscripción y usar la plataforma.';
      case 'VENCIDA':
        return sub.accesoPermitido
          ? 'Tu suscripción venció y estás en el período de gracia. Regularizá el pago para no perder el acceso.'
          : 'Terminó el período de gracia. Regularizá el pago para recuperar el acceso.';
      case 'SUSPENDIDA':
        return (
          sub.motivoBloqueo ??
          'Tu suscripción fue suspendida. Regularizá tu pago para volver a tener acceso.'
        );
      case 'CANCELADA':
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
    return sub.estado !== 'ACTIVA';
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
          if (suscripcion.estado !== 'ACTIVA') {
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
          if (suscripcion.estado === 'ACTIVA') {
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

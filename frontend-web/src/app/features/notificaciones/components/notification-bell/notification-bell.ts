import { Component, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiError } from '../../../auth/models/user';
import { Notificacion } from '../../models/notificacion';
import { NotificacionesService } from '../../services/notificaciones-service';

@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
})
export class NotificationBellComponent implements OnInit {
  private readonly notificacionesService = inject(NotificacionesService);
  private readonly elementRef = inject(ElementRef);

  protected readonly isOpen = signal(false);
  /** Se listan todas, leídas incluidas: marcar como leída no las saca del panel. */
  protected readonly notificaciones = signal<Notificacion[]>([]);
  protected readonly isMarcandoTodas = signal(false);

  protected get unreadCount(): number {
    return this.notificaciones().filter((n) => !n.leida).length;
  }

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  marcarLeida(notificacion: Notificacion): void {
    this.notificacionesService.marcarLeida(notificacion.idNotificacion).subscribe({
      next: () => {
        this.notificaciones.update((lista) =>
          lista.map((n) =>
            n.idNotificacion === notificacion.idNotificacion ? { ...n, leida: true } : n,
          ),
        );
      },
      error: (_error: ApiError) => {},
    });
  }

  marcarTodasLeidas(): void {
    this.isMarcandoTodas.set(true);
    this.notificacionesService.marcarTodasLeidas().subscribe({
      next: () => {
        this.isMarcandoTodas.set(false);
        this.notificaciones.update((lista) => lista.map((n) => ({ ...n, leida: true })));
      },
      error: (_error: ApiError) => {
        this.isMarcandoTodas.set(false);
      },
    });
  }

  private cargarNotificaciones(): void {
    this.notificacionesService.listar().subscribe({
      next: (todas) => {
        this.notificaciones.set(todas);
      },
      error: () => {},
    });
  }
}

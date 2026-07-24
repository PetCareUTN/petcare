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
  protected readonly notificaciones = signal<Notificacion[]>([]);

  protected get unreadCount(): number {
    return this.notificaciones().length;
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
          lista.filter((n) => n.idNotificacion !== notificacion.idNotificacion),
        );
      },
      error: (_error: ApiError) => {},
    });
  }

  private cargarNotificaciones(): void {
    this.notificacionesService.listar().subscribe({
      next: (todas) => {
        this.notificaciones.set(todas.filter((n) => !n.leida));
      },
      error: () => {},
    });
  }
}

import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { UsuarioAdmin } from '../../models/admin';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-usuarios-admin',
  imports: [RouterLink, DatePipe],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
})
export class UsuariosAdminPage implements OnInit, OnDestroy {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly busqueda$ = new Subject<string>();

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly busqueda = signal('');
  protected readonly paginaActual = signal(1);
  protected readonly totalPaginas = signal(1);

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      return;
    }

    this.busqueda$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(valor => {
      this.busqueda.set(valor);
      this.paginaActual.set(1);
      this.cargarUsuarios();
    });

    this.cargarUsuarios();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarios(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.listarUsuarios(this.paginaActual(), 20, this.busqueda() || undefined).subscribe({
      next: (respuesta) => {
        this.usuarios.set(respuesta.usuarios);
        this.totalPaginas.set(Math.ceil(respuesta.total / 20) || 1);
        this.isLoading.set(false);
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }

  onBusquedaChange(value: string): void {
    this.busqueda$.next(this.normalizarAcentos(value));
  }

  onBuscar(): void {
    this.busqueda$.next(this.normalizarAcentos(this.busqueda()));
  }

  private normalizarAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  paginaAnterior(): void {
    if (this.paginaActual() > 1) {
      this.paginaActual.set(this.paginaActual() - 1);
      this.cargarUsuarios();
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual() < this.totalPaginas()) {
      this.paginaActual.set(this.paginaActual() + 1);
      this.cargarUsuarios();
    }
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { AuthService } from '../../../auth/services/auth-service';
import { AuditoriaRegistro, Rol, UsuarioAdmin } from '../../models/admin';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-usuario-detalle',
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './usuario-detalle.html',
  styleUrl: './usuario-detalle.css',
})
export class UsuarioDetallePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);

  protected readonly isLoading = signal(true);
  protected readonly isProcessing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly usuario = signal<UsuarioAdmin | null>(null);
  protected readonly roles = signal<Rol[]>([]);
  protected readonly historial = signal<AuditoriaRegistro[]>([]);
  protected readonly rolSeleccionado = signal<number>(0);

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      return;
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.router.navigateByUrl('/admin/usuarios');
      return;
    }

    this.cargarDatos(id);
  }

  private cargarDatos(id: number): void {
    this.isLoading.set(true);

    this.adminService.obtenerUsuario(id).subscribe({
      next: (usuario) => {
        this.usuario.set(usuario);
        this.rolSeleccionado.set(usuario.id_rol);
        this.cargarRoles();
        this.cargarHistorial(id);
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }

  private cargarRoles(): void {
    this.adminService.listarRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.isLoading.set(false);
      },
      error: (error: ApiError) => {
        this.errorMessage.set(error.mensaje);
        this.isLoading.set(false);
      },
    });
  }

  private cargarHistorial(id: number): void {
    this.adminService.obtenerHistorial(id).subscribe({
      next: (historial) => {
        this.historial.set(historial);
      },
      error: () => {
        // Silenciar error del historial
      },
    });
  }

  nombreRol(id: unknown): string {
    const numId = typeof id === 'number' ? id : Number(id);
    return this.roles().find(r => r.idRol === numId)?.nombre ?? String(id);
  }

  guardarRol(): void {
    const user = this.usuario();
    if (!user) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.adminService.cambiarRol(user.id_usuario, this.rolSeleccionado()).subscribe({
      next: (usuarioActualizado) => {
        this.usuario.set(usuarioActualizado);
        this.successMessage.set('Rol actualizado correctamente.');
        this.isProcessing.set(false);
        this.cargarHistorial(user.id_usuario);
      },
      error: (error: ApiError) => {
        this.isProcessing.set(false);
        this.errorMessage.set(error.mensaje);
      },
    });
  }
}

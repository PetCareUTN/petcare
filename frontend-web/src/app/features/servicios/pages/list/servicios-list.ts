import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../auth/models/user';
import { CategoriaServicio, ServicioResponse } from '../../models/servicio';
import { ServiciosService } from '../../services/servicios-service';

const CATEGORIA_LABELS: Record<CategoriaServicio, string> = {
  paseador: 'Paseador',
  guarderia: 'Guardería',
  peluqueria: 'Peluquería',
};

const DIA_LABELS: Record<string, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

@Component({
  selector: 'app-servicios-list',
  imports: [RouterLink],
  templateUrl: './servicios-list.html',
  styleUrl: './servicios-list.css',
})
export class ServiciosListPage implements OnInit {
  private readonly serviciosService = inject(ServiciosService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly servicios = signal<ServicioResponse[]>([]);
  protected readonly deletingId = signal<number | null>(null);

  ngOnInit(): void {
    this.serviciosService.getMine().subscribe({
      next: (servicios) => {
        this.isLoading.set(false);
        this.servicios.set(servicios);
      },
      error: (error: ApiError) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.mensaje ?? 'No se pudieron cargar tus servicios.');
      },
    });
  }

  protected categoriaLabel(categoria: CategoriaServicio): string {
    return CATEGORIA_LABELS[categoria] ?? categoria;
  }

  protected diaLabel(dia: string): string {
    return DIA_LABELS[dia] ?? dia;
  }

  protected formatHora(hora: string): string {
    return hora.slice(0, 5);
  }

  protected eliminar(servicio: ServicioResponse): void {
    if (!confirm('¿Seguro que querés eliminar este servicio? Esta acción no se puede deshacer.')) {
      return;
    }

    this.errorMessage.set(null);
    this.deletingId.set(servicio.idServicio);

    this.serviciosService.delete(servicio.idServicio).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.servicios.update((actuales) =>
          actuales.filter((s) => s.idServicio !== servicio.idServicio),
        );
      },
      error: (error: ApiError) => {
        this.deletingId.set(null);
        this.errorMessage.set(error.mensaje ?? 'No se pudo eliminar el servicio.');
      },
    });
  }
}

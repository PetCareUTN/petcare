import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ServicioFormPage } from '../servicios/pages/form/servicio-form';
import { ServiciosService } from '../servicios/services/servicios-service';
import { routes } from '../../app.routes';
import { AdminPrestadoresPage } from './admin-prestadores';
import { PrestadoresService, SolicitudPrestador } from './prestadores.service';

const solicitud = (): SolicitudPrestador => ({
  id: 1,
  idUsuario: 20,
  categoria: 'paseador',
  estado: 'pendiente',
  actualizada: '2026-09-05T12:00:00Z',
  identidadRevisada: false,
  contactoVerificado: false,
  referenciasComprobadas: false,
  datos: {
    nombreCompleto: 'María Prueba',
    numeroDocumento: '12345678',
    telefono: '1112345678',
    experiencia: 'Experiencia con mascotas de todas las edades y tamaños.',
    referencias: '',
    protocolo:
      'Prevengo escapes revisando correas y cierres, y coordino emergencias con el dueño y su veterinario.',
    direccion: '',
    capacidad: null,
  },
  historial: [
    {
      estado: 'pendiente',
      motivo: 'Solicitud recibida',
      fecha: '2026-09-05T12:00:00Z',
      idAdmin: null,
    },
  ],
  documentos: [],
});

describe('Pantallas de prestadores', () => {
  const api = { get: vi.fn(), post: vi.fn(), descargar: vi.fn() };
  beforeEach(async () => {
    api.get.mockReset().mockReturnValue(of([]));
    api.post.mockReset().mockReturnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [AdminPrestadoresPage, ServicioFormPage],
      providers: [provideRouter([]), { provide: PrestadoresService, useValue: api }, { provide: ServiciosService, useValue: {} }],
    }).compileComponents();
  });

  it('la web no expone las pantallas de alta, reservas o catálogo del dueño', () => {
    const rutasServicios = routes.find(r => r.path === 'servicios')!.children!.map(r => r.path);
    expect(rutasServicios).not.toContain('solicitud');
    expect(rutasServicios).not.toContain('reservas');
    expect(rutasServicios).not.toContain('explorar');
    expect(routes.find(r => r.path === 'admin')!.children!.some(r => r.path === 'prestadores')).toBe(true);
  });
  it('el formulario web veterinario no exige una segunda solicitud de validación', async () => {
    const fixture = TestBed.createComponent(ServicioFormPage);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    expect(api.get).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('a[href="/servicios/solicitud"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(false);
  });
  it('el administrador no puede aprobar con comprobaciones incompletas', async () => {
    api.get.mockImplementation((path: string) =>
      of(path === 'admin/solicitudes' ? [solicitud()] : []),
    );
    const fixture = TestBed.createComponent(AdminPrestadoresPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.seleccionar(solicitud());
    fixture.componentInstance.revision.estado = 'aprobado';
    fixture.componentInstance.revision.motivo = 'Revisión de identidad por videollamada.';
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const guardar = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((b) => b.textContent?.includes('Guardar decisión'))!;
    expect(guardar.disabled).toBe(true);
    for (const name of ['identidad', 'contacto', 'condiciones']) {
      (fixture.nativeElement.querySelector(`input[name="${name}"]`) as HTMLInputElement).click();
    }
    await fixture.whenStable();
    fixture.detectChanges();
    expect(guardar.disabled).toBe(false);
  });
});

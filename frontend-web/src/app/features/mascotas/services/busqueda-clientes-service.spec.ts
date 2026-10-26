import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { MascotaOwner } from '../models/mascota';
import { BusquedaClientesService } from './busqueda-clientes-service';
import { MascotasService } from './mascotas-service';

const owner = (id: number, nombre: string, apellido: string): MascotaOwner => ({
  id_usuario: id,
  nombre,
  apellido,
  email: `${nombre.toLowerCase()}@mail.com`,
  numero_documento: null,
  telefono: null,
  direccion: null,
  id_rol: 1,
  estado: 'activo',
  fecha_registro: '2026-01-01',
});

describe('BusquedaClientesService', () => {
  let service: BusquedaClientesService;
  let mascotas: { findOwner: ReturnType<typeof vi.fn>; findAllOwners: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mascotas = { findOwner: vi.fn(), findAllOwners: vi.fn().mockReturnValue(of([])) };
    TestBed.configureTestingModule({
      providers: [{ provide: MascotasService, useValue: mascotas }],
    });
    service = TestBed.inject(BusquedaClientesService);
  });

  it('no busca hasta tener un texto que identifique a alguien', () => {
    expect(service.puedeBuscar('a')).toBe(false);
    expect(service.puedeBuscar('12345')).toBe(false);
    expect(service.puedeBuscar('ma')).toBe(true);
    expect(service.puedeBuscar('30111222')).toBe(true);
    expect(service.puedeBuscar('x@y')).toBe(true);
  });

  it('da una pista mientras el texto es corto', () => {
    expect(service.pista('123')).toContain('DNI');
    expect(service.pista('a')).toContain('2 letras');
    expect(service.pista('marta')).toBeNull();
    expect(service.pista('')).toBeNull();
  });

  it('busca por email exacto cuando el texto tiene arroba', async () => {
    mascotas.findOwner.mockReturnValue(of(owner(1, 'Marta', 'Gomez')));

    const result = await firstValueFrom(service.buscar(' Marta@Mail.com '));

    expect(mascotas.findOwner).toHaveBeenCalledWith({ email: 'marta@mail.com' });
    expect(result).toHaveLength(1);
  });

  it('busca por DNI exacto cuando son solo números', async () => {
    mascotas.findOwner.mockReturnValue(of(owner(1, 'Marta', 'Gomez')));

    await firstValueFrom(service.buscar('30111222'));

    expect(mascotas.findOwner).toHaveBeenCalledWith({ documento: '30111222' });
  });

  it('devuelve vacío cuando el email o el DNI no existen', async () => {
    mascotas.findOwner.mockReturnValue(throwError(() => ({ codigoEstado: 404 })));

    expect(await firstValueFrom(service.buscar('30111222'))).toEqual([]);
  });

  it('prueba nombre y apellido en cualquier orden y no repite clientes', async () => {
    const marta = owner(1, 'Marta', 'Gomez');
    mascotas.findAllOwners.mockImplementation((filtro: { nombre?: string; apellido?: string }) =>
      of(filtro.nombre === 'Marta' && filtro.apellido === 'Gomez' ? [marta] : []),
    );
    mascotas.findAllOwners.mockImplementationOnce(() => of([marta]));

    const directo = await firstValueFrom(service.buscar('Marta Gomez'));
    const invertido = await firstValueFrom(service.buscar('Gomez Marta'));

    expect(directo).toEqual([marta]);
    expect(invertido).toEqual([marta]);
    expect(mascotas.findAllOwners).toHaveBeenCalledWith({ nombre: 'Gomez', apellido: 'Marta' });
    expect(mascotas.findAllOwners).toHaveBeenCalledWith({ nombre: 'Marta', apellido: 'Gomez' });
  });
});

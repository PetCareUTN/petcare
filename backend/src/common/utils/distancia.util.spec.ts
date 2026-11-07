import { distanciaEnMetros } from './distancia.util';

describe('distanciaEnMetros', () => {
  it('es cero para el mismo punto', () => {
    expect(distanciaEnMetros(-31.42, -64.189, -31.42, -64.189)).toBe(0);
  });

  it('mide ~111 m por cada milésima de grado de latitud', () => {
    const distancia = distanciaEnMetros(-31.42, -64.189, -31.421, -64.189);
    expect(distancia).toBeGreaterThan(110);
    expect(distancia).toBeLessThan(112);
  });

  it('mide la distancia entre el centro de Córdoba y la Ciudad Universitaria (~3 km)', () => {
    const distancia = distanciaEnMetros(-31.4167, -64.1833, -31.4396, -64.1885);
    expect(distancia).toBeGreaterThan(2_500);
    expect(distancia).toBeLessThan(3_000);
  });
});

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { RegistrarDeteccionDto } from './registrar-deteccion.dto';

describe('RegistrarDeteccionDto', () => {
  // Misma configuración que el ValidationPipe global de main.ts.
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const validar = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: RegistrarDeteccionDto });

  const valida = {
    deteccionId: '9f1c0b6e-3a41-4a2e-8c77-1f2b5d9e0a33',
    tagId: 'C3BBDE4B02A1',
    rssi: -67,
    detectadoEn: '2026-09-12T18:30:00.000Z',
    latitud: -31.42,
    longitud: -64.189,
    precisionMetros: 25,
  };

  it('acepta el payload del contrato de detección', async () => {
    await expect(validar(valida)).resolves.toBeInstanceOf(
      RegistrarDeteccionDto,
    );
  });

  it.each(Object.keys(valida))(
    'rechaza una detección sin %s',
    async (campo) => {
      const incompleta: Record<string, unknown> = { ...valida };
      delete incompleta[campo];

      await expect(validar(incompleta)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    },
  );

  it.each([
    ['deteccionId que no es UUID v4', { deteccionId: 'abc-123' }],
    ['tagId en minúscula', { tagId: 'c3bbde4b02a1' }],
    ['tagId con separadores', { tagId: 'C3:BB:DE:4B:02:A1' }],
    ['rssi fuera de rango', { rssi: -200 }],
    ['rssi no entero', { rssi: -67.5 }],
    ['detectadoEn que no es fecha', { detectadoEn: 'ayer a la tarde' }],
    ['latitud fuera de rango', { latitud: 91 }],
    ['longitud fuera de rango', { longitud: -181 }],
    ['precisionMetros negativa', { precisionMetros: -1 }],
    ['latitud como texto', { latitud: '-31.42' }],
  ])('rechaza %s', async (_, cambio) => {
    await expect(validar({ ...valida, ...cambio })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza que el request traiga datos del detector', async () => {
    await expect(
      validar({ ...valida, idUsuario: 151, deviceId: 'abc' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

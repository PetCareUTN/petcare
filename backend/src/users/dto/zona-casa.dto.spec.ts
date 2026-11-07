import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { User } from '../entities/user.entity';
import { GuardarZonaCasaDto, ZonaCasaResponseDto } from './zona-casa.dto';

describe('GuardarZonaCasaDto (P1-209)', () => {
  const errores = async (datos: object) =>
    (await validate(plainToInstance(GuardarZonaCasaDto, datos))).map(
      (error) => error.property,
    );

  const valida = { latitud: -31.42, longitud: -64.189, radioMetros: 200 };

  it('acepta una zona válida', async () => {
    await expect(errores(valida)).resolves.toEqual([]);
  });

  it('rechaza un radio menor a 100 m', async () => {
    await expect(errores({ ...valida, radioMetros: 99 })).resolves.toEqual([
      'radioMetros',
    ]);
  });

  it('rechaza un radio mayor a 1000 m', async () => {
    await expect(errores({ ...valida, radioMetros: 1001 })).resolves.toEqual([
      'radioMetros',
    ]);
  });

  it('rechaza coordenadas fuera de rango', async () => {
    await expect(
      errores({ ...valida, latitud: 91, longitud: -181 }),
    ).resolves.toEqual(['latitud', 'longitud']);
  });
});

describe('ZonaCasaResponseDto (P1-209)', () => {
  it('informa que no está configurada en vez de devolver coordenadas sueltas', () => {
    const dto = ZonaCasaResponseDto.fromEntity({
      casaLatitud: null,
      casaLongitud: null,
      casaRadioMetros: null,
    } as User);

    expect(dto).toEqual({
      configurada: false,
      latitud: null,
      longitud: null,
      radioMetros: null,
    });
  });
});

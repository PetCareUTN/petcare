import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterVeterinarioDto } from './register-veterinario.dto';
import { UpdateProvinciaDto } from './update-provincia.dto';

const registroValido = {
  nombre: 'Clinica Norte',
  email: 'clinica@petcare.test',
  password: 'ClaveSegura123',
  telefono: '3511234567',
  direccion: 'Av. Siempre Viva 123, Córdoba',
  provincia: 'Córdoba',
  numeroDocumento: '12345678',
  numeroMatricula: 'MAT-001',
  provinciaMatricula: 'Córdoba',
};

const errores = async (plain: object) =>
  (await validate(plainToInstance(RegisterVeterinarioDto, plain))).flatMap(
    (e) => Object.values(e.constraints ?? {}),
  );

describe('provincia en el registro de veterinarias', () => {
  it('acepta un registro con una provincia válida', async () => {
    expect(await errores(registroValido)).toEqual([]);
  });

  it('acepta la Ciudad Autónoma de Buenos Aires', async () => {
    expect(
      await errores({
        ...registroValido,
        provincia: 'Ciudad Autónoma de Buenos Aires',
      }),
    ).toEqual([]);
  });

  it('rechaza un registro sin provincia', async () => {
    const { provincia: _omitida, ...sinProvincia } = registroValido;
    expect(await errores(sinProvincia)).toContain(
      'La provincia es obligatoria',
    );
  });

  it('rechaza una provincia vacía', async () => {
    expect(await errores({ ...registroValido, provincia: '' })).toContain(
      'La provincia es obligatoria',
    );
  });

  it('rechaza un valor que no está en la lista', async () => {
    expect(
      await errores({ ...registroValido, provincia: 'Atlantis' }),
    ).toContain(
      'La provincia debe ser una de las 23 provincias argentinas o Ciudad Autónoma de Buenos Aires',
    );
  });

  it('distingue mayúsculas: "cordoba" no es una provincia de la lista', async () => {
    expect(
      await errores({ ...registroValido, provincia: 'cordoba' }),
    ).not.toEqual([]);
  });
});

describe('UpdateProvinciaDto', () => {
  const validar = async (provincia: unknown) =>
    validate(plainToInstance(UpdateProvinciaDto, { provincia }));

  it('acepta una provincia válida', async () => {
    expect(await validar('Mendoza')).toHaveLength(0);
  });

  it('rechaza una provincia inválida', async () => {
    expect(await validar('Narnia')).toHaveLength(1);
  });

  it('rechaza si falta', async () => {
    expect(await validar(undefined)).toHaveLength(1);
  });
});

import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

const ownerPayload = {
  nombre: 'Ignacio',
  apellido: 'Aldao',
  email: 'ignacio.mascotas@petcare.test',
  password: 'ClaveSegura123',
};

const mascotaPayload = {
  nombre: 'Milo',
  especie: 'Perro',
  raza: 'Mestizo',
  sexo: 'macho',
  fechaNacimiento: '2021-05-10',
  peso: 12.5,
  esterilizado: true,
  foto: 'https://example.com/milo.jpg',
  observaciones: 'Sin observaciones relevantes',
};

type LoginResponse = {
  token?: unknown;
};

type MascotaResponse = {
  idMascota?: unknown;
  nombre?: unknown;
  especie?: unknown;
  raza?: unknown;
  sexo?: unknown;
  fechaNacimiento?: unknown;
  peso?: unknown;
  esterilizado?: unknown;
  foto?: unknown;
  observaciones?: unknown;
  idUsuarios?: unknown;
};

type MascotaRow = {
  id_mascota: number;
  nombre: string;
};

type UsuarioMascotaRow = {
  id_usuario: number;
  id_mascota: number;
};

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('POST /mascotas (contract)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: () =>
          new BadRequestException({
            codigoEstado: 400,
            mensaje: 'Campos obligatorios faltantes o invÃ¡lidos',
          }),
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM "usuarios_mascotas"');
    await dataSource.query('DELETE FROM "mascotas"');
    await dataSource.query('DELETE FROM "usuarios"');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerPayload)
      .expect(201);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "usuarios_mascotas"');
    await dataSource.query('DELETE FROM "mascotas"');
    await dataSource.query('DELETE FROM "usuarios"');
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const login = async (): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerPayload.email, password: ownerPayload.password })
      .expect(200);
    const body = response.body as LoginResponse;

    expect(typeof body.token).toBe('string');
    return String(body.token);
  };

  const queryRows = async <T>(
    query: string,
    parameters: unknown[],
  ): Promise<T[]> => {
    const rows: unknown = await dataSource.query(query, parameters);
    return rows as T[];
  };

  it('PET-01 rejects pet registration without token with 401', async () => {
    await request(app.getHttpServer())
      .post('/mascotas')
      .send(mascotaPayload)
      .expect(401);
  });

  it('PET-02 creates a pet associated with the authenticated owner', async () => {
    const token = await login();

    const response = await request(app.getHttpServer())
      .post('/mascotas')
      .set('Authorization', `Bearer ${token}`)
      .send(mascotaPayload)
      .expect(201);
    const body = response.body as MascotaResponse;

    expect(body).toMatchObject({
      nombre: mascotaPayload.nombre,
      especie: mascotaPayload.especie,
      raza: mascotaPayload.raza,
      sexo: mascotaPayload.sexo,
      fechaNacimiento: mascotaPayload.fechaNacimiento,
      peso: mascotaPayload.peso,
      esterilizado: mascotaPayload.esterilizado,
      foto: mascotaPayload.foto,
      observaciones: mascotaPayload.observaciones,
    });
    expect(body.idMascota).toBeDefined();
    expect(Array.isArray(body.idUsuarios)).toBe(true);
    expect((body.idUsuarios as unknown[]).length).toBe(1);
  });

  it('PET-03 persists the pet and owner relation in PostgreSQL', async () => {
    const token = await login();

    const response = await request(app.getHttpServer())
      .post('/mascotas')
      .set('Authorization', `Bearer ${token}`)
      .send(mascotaPayload)
      .expect(201);
    const body = response.body as MascotaResponse;

    const mascotas = await queryRows<MascotaRow>(
      'SELECT id_mascota, nombre FROM "mascotas" WHERE id_mascota = $1',
      [body.idMascota],
    );
    const relations = await queryRows<UsuarioMascotaRow>(
      'SELECT id_usuario, id_mascota FROM "usuarios_mascotas" WHERE id_mascota = $1',
      [body.idMascota],
    );

    expect(mascotas).toHaveLength(1);
    expect(mascotas[0].nombre).toBe(mascotaPayload.nombre);
    expect(relations).toHaveLength(1);
  });

  it('PET-04 rejects missing required fields with 400', async () => {
    const token = await login();

    await request(app.getHttpServer())
      .post('/mascotas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...mascotaPayload, nombre: '' })
      .expect(400);
  });

  it('PET-05 rejects unknown fields such as idUsuario with 400', async () => {
    const token = await login();

    await request(app.getHttpServer())
      .post('/mascotas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...mascotaPayload, idUsuario: 999 })
      .expect(400);
  });
});

const otherOwnerPayload = {
  nombre: 'Sofia',
  apellido: 'Munoz',
  email: 'sofia.mascotas@petcare.test',
  password: 'ClaveSegura123',
};

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('GET /mascotas/:id (contract)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: () =>
          new BadRequestException({
            codigoEstado: 400,
            mensaje: 'Campos obligatorios faltantes o invÃ¡lidos',
          }),
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM "usuarios_mascotas"');
    await dataSource.query('DELETE FROM "mascotas"');
    await dataSource.query('DELETE FROM "usuarios"');

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerPayload)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(otherOwnerPayload)
      .expect(201);
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM "usuarios_mascotas"');
    await dataSource.query('DELETE FROM "mascotas"');
    await dataSource.query('DELETE FROM "usuarios"');
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const loginAs = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const body = response.body as LoginResponse;

    expect(typeof body.token).toBe('string');
    return String(body.token);
  };

  const createPet = async (token: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post('/mascotas')
      .set('Authorization', `Bearer ${token}`)
      .send(mascotaPayload)
      .expect(201);
    const body = response.body as MascotaResponse;
    return Number(body.idMascota);
  };

  it('PET-06 rejects fetching a pet profile without token with 401', async () => {
    const ownerToken = await loginAs(ownerPayload.email, ownerPayload.password);
    const petId = await createPet(ownerToken);

    await request(app.getHttpServer()).get(`/mascotas/${petId}`).expect(401);
  });

  it('PET-07 returns the full profile for the owner', async () => {
    const ownerToken = await loginAs(ownerPayload.email, ownerPayload.password);
    const petId = await createPet(ownerToken);

    const response = await request(app.getHttpServer())
      .get(`/mascotas/${petId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const body = response.body as MascotaResponse;

    expect(body).toMatchObject({
      idMascota: petId,
      nombre: mascotaPayload.nombre,
      especie: mascotaPayload.especie,
      raza: mascotaPayload.raza,
      sexo: mascotaPayload.sexo,
      fechaNacimiento: mascotaPayload.fechaNacimiento,
      peso: mascotaPayload.peso,
      esterilizado: mascotaPayload.esterilizado,
      foto: mascotaPayload.foto,
      observaciones: mascotaPayload.observaciones,
    });
  });

  it('PET-08 rejects fetching another owner pet profile with 403', async () => {
    const ownerToken = await loginAs(ownerPayload.email, ownerPayload.password);
    const petId = await createPet(ownerToken);
    const otherToken = await loginAs(
      otherOwnerPayload.email,
      otherOwnerPayload.password,
    );

    await request(app.getHttpServer())
      .get(`/mascotas/${petId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
  });

  it('PET-09 returns 404 for a pet that does not exist', async () => {
    const ownerToken = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .get('/mascotas/999999')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});

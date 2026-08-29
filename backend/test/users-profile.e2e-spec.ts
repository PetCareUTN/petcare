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
  numeroDocumento: '30111225',
  email: 'ignacio.perfil@petcare.test',
  password: 'ClaveSegura123',
};

const otherOwnerPayload = {
  nombre: 'Sofia',
  apellido: 'Munoz',
  numeroDocumento: '30111226',
  email: 'sofia.perfil@petcare.test',
  password: 'ClaveSegura123',
};

type LoginResponse = {
  token?: unknown;
};

type UserResponse = {
  id_usuario?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  email?: unknown;
  telefono?: unknown;
  id_rol?: unknown;
  estado?: unknown;
  fecha_registro?: unknown;
};

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('PATCH /users/me (contract)', () => {
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
            mensaje: 'Campos obligatorios faltantes o inválidos',
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

  it('PROF-01 rejects updating the profile without token with 401', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .send({ nombre: 'Nuevo Nombre' })
      .expect(401);
  });

  it('PROF-02 updates the authenticated user profile', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Ignacio Actualizado', telefono: '3511234567' })
      .expect(200);
    const body = response.body as UserResponse;

    expect(body).toMatchObject({
      nombre: 'Ignacio Actualizado',
      telefono: '3511234567',
      apellido: ownerPayload.apellido,
      email: ownerPayload.email,
    });
  });

  it('PROF-03 persists the change in PostgreSQL', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefono: '3511234567' })
      .expect(200);

    const rows = await dataSource.query<{ telefono: string }[]>(
      'SELECT telefono FROM "usuarios" WHERE email = $1',
      [ownerPayload.email],
    );

    expect(rows[0].telefono).toBe('3511234567');
  });

  it('PROF-04 rejects an invalid email with 400', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'email-invalido' })
      .expect(400);
  });

  it('PROF-05 rejects an email already used by another user with 409', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: otherOwnerPayload.email })
      .expect(409);
  });

  it('PROF-06 rejects unknown fields such as id_rol with 400', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ id_rol: 3 })
      .expect(400);
  });

  it('PROF-08 rejects a nombre containing digits with 400', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Ignacio123' })
      .expect(400);
  });

  it('PROF-09 rejects a telefono containing letters with 400', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ telefono: 'abc1234567' })
      .expect(400);
  });

  it('PROF-07 does not affect another user profile', async () => {
    const token = await loginAs(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Ignacio Actualizado' })
      .expect(200);

    const rows = await dataSource.query<{ nombre: string }[]>(
      'SELECT nombre FROM "usuarios" WHERE email = $1',
      [otherOwnerPayload.email],
    );

    expect(rows[0].nombre).toBe(otherOwnerPayload.nombre);
  });
});

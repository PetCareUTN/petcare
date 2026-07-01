import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const validRegisterPayload = {
  nombre: 'Ignacio',
  apellido: 'Aldao',
  email: 'ignacio.owner@petcare.test',
  password: 'ClaveSegura123',
  rol: 'OWNER',
};

type RegisterResponse = {
  id?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  email?: unknown;
  rol?: unknown;
  password?: unknown;
  passwordHash?: unknown;
};

// Pending until P1-21 (database/model) and P1-2 (register endpoint) are integrated.
describe.skip('POST /auth/register (contract)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('REG-01 creates a user with valid data', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);
    const body = response.body as RegisterResponse;

    expect(body).toMatchObject({
      nombre: validRegisterPayload.nombre,
      apellido: validRegisterPayload.apellido,
      email: validRegisterPayload.email,
      rol: validRegisterPayload.rol,
    });
    expect(body.id).toBeDefined();
  });

  it('REG-02 rejects duplicated email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(409);
  });

  it('REG-03 rejects invalid email', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, email: 'email-invalido' })
      .expect(400);
  });

  it('REG-04 rejects empty password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, password: '' })
      .expect(400);
  });

  it('REG-05 rejects empty name', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, nombre: '' })
      .expect(400);
  });

  it('REG-06 rejects invalid role', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, rol: 'INVALID_ROLE' })
      .expect(400);
  });

  it('REG-07 does not expose password fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);
    const body = response.body as RegisterResponse;

    expect(body.password).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
  });

  it.todo('REG-08 persists the created user in PostgreSQL');

  it.todo('REG-09 stores password as a hash');
});

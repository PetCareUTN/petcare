import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { User } from './../src/users/entities/user.entity';

const validRegisterPayload = {
  nombre: 'Ignacio',
  apellido: 'Aldao',
  numeroDocumento: '30111221',
  email: 'ignacio.owner@petcare.test',
  password: 'ClaveSegura123',
};

type RegisterResponse = {
  id_usuario?: unknown;
  nombre?: unknown;
  apellido?: unknown;
  email?: unknown;
  id_rol?: unknown;
  estado?: unknown;
  fecha_registro?: unknown;
  password?: unknown;
  passwordHash?: unknown;
};

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('POST /auth/register (contract)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;
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

    usersRepository = moduleFixture.get(getRepositoryToken(User));
    dataSource = app.get(DataSource);

    await dataSource.query('DELETE FROM "usuarios_mascotas"');
    await dataSource.query('DELETE FROM "mascotas"');
    await dataSource.query('DELETE FROM "usuarios"');
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
      estado: 'activo',
    });
    expect(body.id_usuario).toBeDefined();
    expect(body.id_rol).toBeDefined();
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

  it('REG-04 rejects short password', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, password: '1234567' })
      .expect(400);
  });

  it('REG-05 rejects empty name', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, nombre: '' })
      .expect(400);
  });

  it('REG-05B rejects a missing DNI', async () => {
    const payloadWithoutDni: Partial<typeof validRegisterPayload> = {
      ...validRegisterPayload,
    };
    delete payloadWithoutDni.numeroDocumento;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(payloadWithoutDni)
      .expect(400);
  });

  it('REG-05C rejects an invalid DNI', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, numeroDocumento: '12A' })
      .expect(400);
  });

  it('REG-05D rejects a duplicated DNI', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...validRegisterPayload,
        email: 'otro.owner@petcare.test',
      })
      .expect(409);
  });

  it('REG-06 rejects unknown fields such as rol', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...validRegisterPayload, rol: 'ADMIN' })
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

  it('REG-08 persists the created user in PostgreSQL', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);
    const body = response.body as RegisterResponse;

    const persisted = await usersRepository.findOne({
      where: { email: validRegisterPayload.email },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.idUsuario).toBe(body.id_usuario);
  });

  it('REG-09 stores password as a hash', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);

    const persisted = await usersRepository.findOne({
      where: { email: validRegisterPayload.email },
    });

    expect(persisted?.password).toBeDefined();
    expect(persisted?.password).not.toBe(validRegisterPayload.password);
    expect(
      await bcrypt.compare(
        validRegisterPayload.password,
        persisted!.password ?? '',
      ),
    ).toBe(true);
  });
});

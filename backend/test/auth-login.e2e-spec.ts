import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from './../src/app.module';
import { User } from './../src/users/entities/user.entity';

const validRegisterPayload = {
  nombre: 'Ignacio',
  apellido: 'Aldao',
  email: 'ignacio.login@petcare.test',
  password: 'ClaveSegura123',
};

const validLoginPayload = {
  email: validRegisterPayload.email,
  password: validRegisterPayload.password,
};

type LoginResponse = {
  token?: unknown;
  usuario?: {
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
  password?: unknown;
  passwordHash?: unknown;
};

type ProfileResponse = NonNullable<LoginResponse['usuario']>;

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('POST /auth/login and GET /auth/me (contract)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;

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
  });

  beforeEach(async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(validRegisterPayload)
      .expect(201);
  });

  afterEach(async () => {
    await usersRepository.clear();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.destroy();
    await app.close();
  });

  it('LOGIN-01 returns a token and public user for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(validLoginPayload)
      .expect(200);
    const body = response.body as LoginResponse;

    expect(typeof body.token).toBe('string');
    expect(body.usuario).toMatchObject({
      nombre: validRegisterPayload.nombre,
      apellido: validRegisterPayload.apellido,
      email: validRegisterPayload.email,
      estado: 'activo',
    });
    expect(body.usuario?.id_usuario).toBeDefined();
    expect(body.usuario?.id_rol).toBeDefined();
  });

  it('LOGIN-02 does not expose password fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(validLoginPayload)
      .expect(200);
    const body = response.body as LoginResponse;

    expect(body.password).toBeUndefined();
    expect(body.passwordHash).toBeUndefined();
    expect(body.usuario?.password).toBeUndefined();
    expect(body.usuario?.passwordHash).toBeUndefined();
  });

  it('LOGIN-03 rejects nonexistent email with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...validLoginPayload, email: 'no-existe@petcare.test' })
      .expect(401);
  });

  it('LOGIN-04 rejects wrong password with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...validLoginPayload, password: 'ClaveIncorrecta123' })
      .expect(401);
  });

  it('LOGIN-05 rejects invalid email format with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...validLoginPayload, email: 'email-invalido' })
      .expect(400);
  });

  it('LOGIN-06 rejects empty password with 400', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ ...validLoginPayload, password: '' })
      .expect(400);
  });

  it('LOGIN-07 allows access to protected profile with a valid token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(validLoginPayload)
      .expect(200);
    const loginBody = loginResponse.body as LoginResponse;

    const profileResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${String(loginBody.token)}`)
      .expect(200);
    const profileBody = profileResponse.body as ProfileResponse;

    expect(profileBody).toMatchObject({
      email: validRegisterPayload.email,
      estado: 'activo',
    });
    expect(profileBody.id_usuario).toBe(loginBody.usuario?.id_usuario);
  });

  it('LOGIN-08 rejects protected profile without token with 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});

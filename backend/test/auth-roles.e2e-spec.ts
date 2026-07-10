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
import { RoleName } from './../src/common/enums/role-name.enum';
import { Role } from './../src/roles/entities/role.entity';
import { User } from './../src/users/entities/user.entity';

const ownerPayload = {
  nombre: 'Ignacio',
  apellido: 'Aldao',
  email: 'ignacio.roles.owner@petcare.test',
  password: 'ClaveSegura123',
};

const adminPayload = {
  nombre: 'Admin',
  apellido: 'PetCare',
  email: 'admin.roles@petcare.test',
  password: 'ClaveAdmin123',
};

type LoginResponse = {
  token?: unknown;
};

type AdminResponse = {
  mensaje?: unknown;
};

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('Role-based authorization (contract)', () => {
  let app: INestApplication<App>;
  let usersRepository: Repository<User>;
  let rolesRepository: Repository<Role>;

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
    rolesRepository = moduleFixture.get(getRepositoryToken(Role));
  });

  beforeEach(async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(ownerPayload)
      .expect(201);

    const adminRole = await rolesRepository.findOneOrFail({
      where: { nombre: RoleName.ADMINISTRADOR },
    });
    const password = await bcrypt.hash(adminPayload.password, 10);
    await usersRepository.save(
      usersRepository.create({
        nombre: adminPayload.nombre,
        apellido: adminPayload.apellido,
        email: adminPayload.email,
        password,
        rol: adminRole,
      }),
    );
  });

  afterEach(async () => {
    await usersRepository.clear();
  });

  afterAll(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.destroy();
    await app.close();
  });

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const body = response.body as LoginResponse;

    expect(typeof body.token).toBe('string');
    return String(body.token);
  };

  it('ROLE-01 rejects admin route without token with 401', async () => {
    await request(app.getHttpServer()).get('/auth/admin-test').expect(401);
  });

  it('ROLE-02 rejects admin route for dueño_mascota with 403', async () => {
    const token = await login(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .get('/auth/admin-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('ROLE-03 allows admin route for administrador with 200', async () => {
    const token = await login(adminPayload.email, adminPayload.password);

    const response = await request(app.getHttpServer())
      .get('/auth/admin-test')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = response.body as AdminResponse;

    expect(body.mensaje).toBe('Acceso autorizado para administrador');
  });

  it('ROLE-04 rejects admin route with invalid token with 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/admin-test')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('ROLE-05 keeps profile route available for authenticated owner', async () => {
    const token = await login(ownerPayload.email, ownerPayload.password);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

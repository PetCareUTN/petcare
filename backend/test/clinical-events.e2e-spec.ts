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
import { ClinicalEventType } from './../src/common/enums/clinical-event-type.enum';
import { PetSex } from './../src/common/enums/pet-sex.enum';
import { RoleName } from './../src/common/enums/role-name.enum';
import { ValidationStatus } from './../src/common/enums/validation-status.enum';
import { EventoClinico } from './../src/eventos-clinicos/entities/evento-clinico.entity';
import { HistoriaClinica } from './../src/historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from './../src/mascotas/entities/mascota.entity';
import { Role } from './../src/roles/entities/role.entity';
import { User } from './../src/users/entities/user.entity';
import { Veterinario } from './../src/veterinarios/entities/veterinario.entity';

const approvedVetPayload = {
  nombre: 'Vet',
  apellido: 'Aprobado',
  email: 'vet.clinical.approved@petcare.test',
  password: 'ClaveVet123',
};

const pendingVetPayload = {
  nombre: 'Vet',
  apellido: 'Pendiente',
  email: 'vet.clinical.pending@petcare.test',
  password: 'ClaveVet123',
};

const ownerPayload = {
  nombre: 'Duenio',
  apellido: 'Mascota',
  email: 'owner.clinical@petcare.test',
  password: 'ClaveOwner123',
};

type LoginResponse = {
  token?: unknown;
};

type ClinicalEventResponse = {
  idEvento?: unknown;
  idHistoria?: unknown;
  idMascota?: unknown;
  idVeterinario?: unknown;
  tipo?: unknown;
  fecha?: unknown;
  descripcion?: unknown;
  diagnostico?: unknown;
  tratamiento?: unknown;
  observaciones?: unknown;
};

// Requires PostgreSQL running (docker compose up -d) with migrations and role seed applied.
describe('POST /eventos-clinicos (contract)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let rolesRepository: Repository<Role>;
  let usersRepository: Repository<User>;
  let mascotasRepository: Repository<Mascota>;
  let veterinariosRepository: Repository<Veterinario>;
  let eventosClinicosRepository: Repository<EventoClinico>;

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
            mensaje: 'Campos obligatorios faltantes o invalidos',
          }),
      }),
    );
    await app.init();

    dataSource = app.get(DataSource);
    rolesRepository = moduleFixture.get(getRepositoryToken(Role));
    usersRepository = moduleFixture.get(getRepositoryToken(User));
    mascotasRepository = moduleFixture.get(getRepositoryToken(Mascota));
    veterinariosRepository = moduleFixture.get(getRepositoryToken(Veterinario));
    eventosClinicosRepository = moduleFixture.get(getRepositoryToken(EventoClinico));
  });

  beforeEach(async () => {
    await cleanClinicalEventData();
    await seedClinicalEventScenario();
  });

  afterEach(async () => {
    await cleanClinicalEventData();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  const cleanClinicalEventData = async (): Promise<void> => {
    await dataSource.query('DELETE FROM "eventos_clinicos"');
    await dataSource.query('DELETE FROM "usuarios_mascotas"');
    await dataSource.query('DELETE FROM "mascotas"');
    await dataSource.query('DELETE FROM "historias_clinicas"');
    await dataSource.query('DELETE FROM "veterinarios"');
    await dataSource.query('DELETE FROM "usuarios"');
  };

  const createUser = async (
    payload: typeof approvedVetPayload,
    roleName: RoleName,
  ): Promise<User> => {
    const role = await rolesRepository.findOneOrFail({
      where: { nombre: roleName },
    });
    const password = await bcrypt.hash(payload.password, 10);

    return usersRepository.save(
      usersRepository.create({
        nombre: payload.nombre,
        apellido: payload.apellido,
        email: payload.email,
        password,
        rol: role,
      }),
    );
  };

  const seedClinicalEventScenario = async (): Promise<void> => {
    const approvedVetUser = await createUser(
      approvedVetPayload,
      RoleName.VETERINARIO,
    );
    const pendingVetUser = await createUser(
      pendingVetPayload,
      RoleName.VETERINARIO,
    );
    const owner = await createUser(ownerPayload, RoleName.DUENO_MASCOTA);

    await veterinariosRepository.save(
      veterinariosRepository.create({
        usuario: approvedVetUser,
        numeroDocumento: '30111222',
        numeroMatricula: 'MAT-E2E-001',
        provinciaMatricula: 'Buenos Aires',
        matriculaUrl: 'uploads/matriculas/e2e-approved.pdf',
        estadoValidacion: ValidationStatus.APROBADO,
      }),
    );
    await veterinariosRepository.save(
      veterinariosRepository.create({
        usuario: pendingVetUser,
        numeroDocumento: '30111223',
        numeroMatricula: 'MAT-E2E-002',
        provinciaMatricula: 'Buenos Aires',
        matriculaUrl: 'uploads/matriculas/e2e-pending.pdf',
        estadoValidacion: ValidationStatus.PENDIENTE,
      }),
    );

    await mascotasRepository.save(
      mascotasRepository.create({
        nombre: 'Mora',
        especie: 'Perro',
        raza: 'Mestiza',
        sexo: PetSex.HEMBRA,
        fechaNacimiento: '2021-02-03',
        peso: '12.50',
        esterilizado: true,
        foto: null,
        observaciones: null,
        alergias: null,
        usuarios: [owner],
      }),
    );
  };

  const login = async (email: string, password: string): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const body = response.body as LoginResponse;

    expect(typeof body.token).toBe('string');
    return String(body.token);
  };

  const getMascota = async (): Promise<Mascota> =>
    mascotasRepository.findOneOrFail({
      where: { nombre: 'Mora' },
      relations: ['historiaClinica'],
    });

  it('CLIN-01 registers a clinical event for an approved veterinarian', async () => {
    const token = await login(approvedVetPayload.email, approvedVetPayload.password);
    const mascota = await getMascota();

    const response = await request(app.getHttpServer())
      .post('/eventos-clinicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idMascota: mascota.idMascota,
        tipo: ClinicalEventType.DIAGNOSTICO,
        fecha: '2026-08-03',
        descripcion: 'Consulta por tos persistente',
        diagnostico: 'Bronquitis leve',
        tratamiento: 'Reposo y control',
        observaciones: 'Controlar evolucion en 7 dias',
      })
      .expect(201);
    const body = response.body as ClinicalEventResponse;

    expect(body).toMatchObject({
      idMascota: mascota.idMascota,
      tipo: ClinicalEventType.DIAGNOSTICO,
      fecha: '2026-08-03',
      descripcion: 'Consulta por tos persistente',
      diagnostico: 'Bronquitis leve',
      tratamiento: 'Reposo y control',
      observaciones: 'Controlar evolucion en 7 dias',
    });
    expect(typeof body.idEvento).toBe('number');
    expect(typeof body.idHistoria).toBe('number');
    expect(typeof body.idVeterinario).toBe('number');

    const savedEvent = await eventosClinicosRepository.findOneOrFail({
      where: { idEvento: Number(body.idEvento) },
      relations: ['historia', 'historia.mascota', 'veterinario'],
    });

    expect(savedEvent.historia.idHistoria).toBe(body.idHistoria);
    expect(savedEvent.historia.mascota.idMascota).toBe(mascota.idMascota);
    expect(savedEvent.veterinario.idVeterinario).toBe(body.idVeterinario);

    const updatedMascota = await getMascota();
    expect(updatedMascota.idHistoria).toBe(body.idHistoria);
  });

  it('CLIN-02 rejects missing required fields with 400', async () => {
    const token = await login(approvedVetPayload.email, approvedVetPayload.password);
    const mascota = await getMascota();

    await request(app.getHttpServer())
      .post('/eventos-clinicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idMascota: mascota.idMascota,
        tipo: ClinicalEventType.DIAGNOSTICO,
        fecha: '2026-08-03',
      })
      .expect(400);
  });

  it('CLIN-03 rejects nonexistent pets with 404', async () => {
    const token = await login(approvedVetPayload.email, approvedVetPayload.password);

    await request(app.getHttpServer())
      .post('/eventos-clinicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idMascota: 999999,
        tipo: ClinicalEventType.DIAGNOSTICO,
        fecha: '2026-08-03',
        descripcion: 'Consulta sin mascota existente',
      })
      .expect(404);
  });

  it('CLIN-04 rejects owners because the endpoint requires veterinarian role', async () => {
    const token = await login(ownerPayload.email, ownerPayload.password);
    const mascota = await getMascota();

    await request(app.getHttpServer())
      .post('/eventos-clinicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idMascota: mascota.idMascota,
        tipo: ClinicalEventType.DIAGNOSTICO,
        fecha: '2026-08-03',
        descripcion: 'Intento con usuario duenio',
      })
      .expect(403);
  });

  it('CLIN-05 rejects veterinarians without approved validation with 403', async () => {
    const token = await login(pendingVetPayload.email, pendingVetPayload.password);
    const mascota = await getMascota();

    await request(app.getHttpServer())
      .post('/eventos-clinicos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        idMascota: mascota.idMascota,
        tipo: ClinicalEventType.DIAGNOSTICO,
        fecha: '2026-08-03',
        descripcion: 'Intento con veterinario pendiente',
      })
      .expect(403);
  });
});

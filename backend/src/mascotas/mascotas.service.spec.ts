import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PetSex } from '../common/enums/pet-sex.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { Mascota } from './entities/mascota.entity';
import { MascotasService } from './mascotas.service';
import { UpdateMascotaDto } from './dto/update-mascota.dto';

describe('MascotasService', () => {
  let service: MascotasService;
  let mascotasRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let usersRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };
  let eventosClinicosRepository: {
    findOne: jest.Mock;
  };
  const duenio = {
    idUsuario: 1,
    nombre: 'Sofia',
    apellido: 'Munoz',
    email: 'sofia@petcare.test',
    numeroDocumento: '30111222',
    telefono: null,
    direccion: null,
    estado: 'activo',
    fechaRegistro: new Date('2026-08-08T00:00:00.000Z'),
    rol: { idRol: 1, nombre: RoleName.DUENO_MASCOTA },
  } as User;
  const otroUsuario = { idUsuario: 2 } as User;
  const veterinariaUser = {
    idUsuario: 3,
    rol: { idRol: 2, nombre: RoleName.VETERINARIO },
  } as User;
  const duenioRequester: JwtPayload = {
    sub: duenio.idUsuario,
    email: 'duenio@petcare.com',
    idRol: 1,
    rol: RoleName.DUENO_MASCOTA,
  };
  const otroUsuarioRequester: JwtPayload = {
    sub: otroUsuario.idUsuario,
    email: 'otro@petcare.com',
    idRol: 1,
    rol: RoleName.DUENO_MASCOTA,
  };
  const veterinarioRequester: JwtPayload = {
    sub: 4,
    email: 'vet@petcare.com',
    idRol: 2,
    rol: RoleName.VETERINARIO,
  };

  const buildMascota = (overrides: Partial<Mascota> = {}): Mascota =>
    ({
      idMascota: 10,
      nombre: 'Firulais',
      idHistoria: null,
      especie: 'Perro',
      raza: 'Labrador',
      sexo: PetSex.MACHO,
      fechaNacimiento: '2020-01-01',
      peso: '15.50',
      esterilizado: false,
      foto: null,
      observaciones: null,
      alergias: null,
      usuarios: [duenio],
      ...overrides,
    }) as Mascota;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MascotasService,
        {
          provide: getRepositoryToken(Mascota),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventoClinico),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MascotasService>(MascotasService);
    mascotasRepository = module.get(getRepositoryToken(Mascota));
    usersRepository = module.get(getRepositoryToken(User));
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
    eventosClinicosRepository = module.get(getRepositoryToken(EventoClinico));
  });

  describe('create', () => {
    it('persists alergias and observaciones when provided', async () => {
      usersRepository.findOne.mockResolvedValue(duenio);
      mascotasRepository.create.mockImplementation(
        (entity: Partial<Mascota>) => entity as Mascota,
      );
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, idMascota: 10 }),
      );

      const result = await service.create(duenio.idUsuario, {
        nombre: 'Firulais',
        especie: 'Perro',
        sexo: PetSex.MACHO,
        alergias: 'Alergia al polen',
        observaciones: 'Toma medicación diaria',
      });

      expect(mascotasRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          alergias: 'Alergia al polen',
          observaciones: 'Toma medicación diaria',
        }),
      );
      expect(result.alergias).toBe('Alergia al polen');
      expect(result.observaciones).toBe('Toma medicación diaria');
    });

    it('defaults alergias to null when not provided', async () => {
      usersRepository.findOne.mockResolvedValue(duenio);
      mascotasRepository.create.mockImplementation(
        (entity: Partial<Mascota>) => entity as Mascota,
      );
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, idMascota: 10 }),
      );

      const result = await service.create(duenio.idUsuario, {
        nombre: 'Firulais',
        especie: 'Perro',
        sexo: PetSex.MACHO,
      });

      expect(result.alergias).toBeNull();
    });
  });

  describe('findOwnerByEmail', () => {
    it('returns a public owner when the email belongs to an owner account', async () => {
      usersRepository.findOne.mockResolvedValue(duenio);

      const result = await service.findOwnerByEmail('  SOFIA@PETCARE.TEST ');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: expect.anything(),
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id_usuario: duenio.idUsuario,
          email: duenio.email,
          id_rol: 1,
        }),
      );
      expect((result as unknown as { password?: string }).password).toBeUndefined();
    });

    it('throws BadRequestException when searching without email', async () => {
      await expect(service.findOwnerByEmail('   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no user exists for the email', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOwnerByEmail('inexistente@petcare.test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the user is not an owner', async () => {
      usersRepository.findOne.mockResolvedValue(veterinariaUser);

      await expect(
        service.findOwnerByEmail('vet@petcare.test'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllOwners', () => {
    it('lista los dueños filtrando por nombre y apellido', async () => {
      usersRepository.find.mockResolvedValue([duenio]);

      const result = await service.findAllOwners('sof', 'mun');

      expect(usersRepository.find).toHaveBeenCalledWith({
        where: {
          rol: { nombre: RoleName.DUENO_MASCOTA },
          nombre: expect.anything(),
          apellido: expect.anything(),
        },
        order: { apellido: 'ASC', nombre: 'ASC' },
      });
      expect(result).toEqual([
        expect.objectContaining({ id_usuario: duenio.idUsuario, email: duenio.email }),
      ]);
    });

    it('lista todos los dueños cuando no se pasa ningún filtro', async () => {
      usersRepository.find.mockResolvedValue([duenio]);

      await service.findAllOwners();

      expect(usersRepository.find).toHaveBeenCalledWith({
        where: { rol: { nombre: RoleName.DUENO_MASCOTA } },
        order: { apellido: 'ASC', nombre: 'ASC' },
      });
    });

    it('devuelve una lista vacía cuando no hay coincidencias', async () => {
      usersRepository.find.mockResolvedValue([]);

      const result = await service.findAllOwners('inexistente');

      expect(result).toEqual([]);
    });
  });

  describe('createForExistingOwner', () => {
    it('creates a pet associated to an existing owner account', async () => {
      usersRepository.findOne.mockResolvedValue(duenio);
      mascotasRepository.create.mockImplementation(
        (entity: Partial<Mascota>) => entity as Mascota,
      );
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, idMascota: 11 }),
      );

      const result = await service.createForExistingOwner(duenio.idUsuario, {
        nombre: 'Michi',
        especie: 'Gato',
        raza: 'Siames',
        sexo: PetSex.HEMBRA,
        peso: 4.2,
      });

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { idUsuario: duenio.idUsuario },
      });
      expect(mascotasRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Michi',
          especie: 'Gato',
          raza: 'Siames',
          peso: '4.20',
          usuarios: [duenio],
        }),
      );
      expect(result.idMascota).toBe(11);
      expect(result.idUsuarios).toEqual([duenio.idUsuario]);
    });

    it('throws NotFoundException when the target owner does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createForExistingOwner(999, {
          nombre: 'Michi',
          especie: 'Gato',
          sexo: PetSex.HEMBRA,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mascotasRepository.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the target user is not an owner', async () => {
      usersRepository.findOne.mockResolvedValue(veterinariaUser);

      await expect(
        service.createForExistingOwner(veterinariaUser.idUsuario, {
          nombre: 'Michi',
          especie: 'Gato',
          sexo: PetSex.HEMBRA,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mascotasRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the mascota does not exist', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(999, duenioRequester),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the user is not an owner nor a treating vet', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());

      await expect(
        service.findOne(10, otroUsuarioRequester),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns the mascota when the user is an owner', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());

      const result = await service.findOne(10, duenioRequester);

      expect(result.idMascota).toBe(10);
      expect(result.nombre).toBe('Firulais');
    });

    it('returns the mascota when a validated vet already treated it', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        buildMascota({ idHistoria: 20 }),
      );
      veterinariosRepository.findOne.mockResolvedValue({
        idVeterinario: 4,
        estadoValidacion: ValidationStatus.APROBADO,
      });
      eventosClinicosRepository.findOne.mockResolvedValue({ idEvento: 30 });

      const result = await service.findOne(10, veterinarioRequester);

      expect(veterinariosRepository.findOne).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: 4 } },
      });
      expect(eventosClinicosRepository.findOne).toHaveBeenCalledWith({
        where: {
          historia: { idHistoria: 20 },
          veterinario: { idVeterinario: 4 },
        },
      });
      expect(result.idMascota).toBe(10);
    });

    it('returns the mascota when a validated vet is attending the searched owner', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());
      veterinariosRepository.findOne.mockResolvedValue({
        idVeterinario: 4,
        estadoValidacion: ValidationStatus.APROBADO,
      });

      const result = await service.findOne(10, veterinarioRequester, {
        ownerDocument: '30111222',
      });

      expect(eventosClinicosRepository.findOne).not.toHaveBeenCalled();
      expect(result.idMascota).toBe(10);
    });

    it('throws ForbiddenException when the vet never treated the mascota', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        buildMascota({ idHistoria: 20 }),
      );
      veterinariosRepository.findOne.mockResolvedValue({
        idVeterinario: 4,
        estadoValidacion: ValidationStatus.APROBADO,
      });
      eventosClinicosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(10, veterinarioRequester),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when the vet is not validated', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        buildMascota({ idHistoria: 20 }),
      );
      veterinariosRepository.findOne.mockResolvedValue({
        idVeterinario: 4,
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      await expect(
        service.findOne(10, veterinarioRequester),
      ).rejects.toThrow(ForbiddenException);
      expect(eventosClinicosRepository.findOne).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the mascota never had a historia clinica', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        buildMascota({ idHistoria: null }),
      );
      veterinariosRepository.findOne.mockResolvedValue({
        idVeterinario: 4,
        estadoValidacion: ValidationStatus.APROBADO,
      });

      await expect(
        service.findOne(10, veterinarioRequester),
      ).rejects.toThrow(ForbiddenException);
      expect(eventosClinicosRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the mascota does not exist', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, duenio.idUsuario, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the user is not an owner', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());

      await expect(
        service.update(10, otroUsuario.idUsuario, { nombre: 'Otro' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('applies only the provided fields and keeps the rest untouched', async () => {
      const mascota = buildMascota();
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateMascotaDto = {
        nombre: 'Firulais II',
        sexo: PetSex.HEMBRA,
      };

      const result = await service.update(10, duenio.idUsuario, dto);

      expect(mascotasRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Firulais II',
          sexo: PetSex.HEMBRA,
          especie: 'Perro',
          raza: 'Labrador',
        }),
      );
      expect(result.nombre).toBe('Firulais II');
      expect(result.sexo).toBe(PetSex.HEMBRA);
      expect(result.especie).toBe('Perro');
    });

    it('allows correcting especie and sexo from an initial loading error', async () => {
      const mascota = buildMascota();
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateMascotaDto = { especie: 'Gato', sexo: PetSex.HEMBRA };

      const result = await service.update(10, duenio.idUsuario, dto);

      expect(result.especie).toBe('Gato');
      expect(result.sexo).toBe(PetSex.HEMBRA);
    });

    it('updates alergias without touching other medical fields', async () => {
      const mascota = buildMascota({
        observaciones: 'Toma medicación diaria',
      });
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(10, duenio.idUsuario, {
        alergias: 'Alergia a la penicilina',
      });

      expect(mascotasRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          alergias: 'Alergia a la penicilina',
          observaciones: 'Toma medicación diaria',
          nombre: 'Firulais',
        }),
      );
      expect(result.alergias).toBe('Alergia a la penicilina');
      expect(result.observaciones).toBe('Toma medicación diaria');
    });

    it('allows clearing alergias with an empty string', async () => {
      const mascota = buildMascota({ alergias: 'Alergia al polen' });
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(10, duenio.idUsuario, {
        alergias: '',
      });

      expect(result.alergias).toBe('');
    });

    it('converts peso to the fixed-point string format used by the entity', async () => {
      const mascota = buildMascota();
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.update(10, duenio.idUsuario, { peso: 12.3 });

      expect(mascotasRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ peso: '12.30' }),
      );
    });

    it('replaces the foto when a new file is uploaded', async () => {
      const mascota = buildMascota({ foto: '/uploads/mascotas/old.jpg' });
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      jest
        .spyOn(
          service as unknown as { saveFoto: (f: unknown) => Promise<string> },
          'saveFoto',
        )
        .mockResolvedValue('/uploads/mascotas/new.jpg');

      const foto = {
        mimetype: 'image/png',
        originalname: 'new.png',
        buffer: Buffer.from(''),
      };
      const result = await service.update(10, duenio.idUsuario, {}, foto);

      expect(result.foto).toBe('/uploads/mascotas/new.jpg');
    });
  });
});

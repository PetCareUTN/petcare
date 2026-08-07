import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findByEmail looks up a user by email', async () => {
    const user = { idUsuario: 1, email: 'simon@petcare.test' } as User;
    repository.findOne.mockResolvedValue(user);

    const result = await service.findByEmail('simon@petcare.test');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { email: 'simon@petcare.test' },
    });
    expect(result).toBe(user);
  });

  it('create persists a new user with the given role', async () => {
    const data = {
      nombre: 'Simon',
      apellido: 'Breitkopf',
      email: 'simon@petcare.test',
      password: 'hashed-password',
      idRol: 1,
    };
    const created = { ...data, rol: { idRol: 1 } } as unknown as User;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    const result = await service.create(data);

    expect(repository.create).toHaveBeenCalledWith({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: data.password,
      telefono: null,
      direccion: null,
      estado: 'activo',
      idVeterinarioAltaAsistida: null,
      rol: { idRol: data.idRol },
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result).toBe(created);
  });

  it('create persists telefono and direccion when provided (registro de veterinario)', async () => {
    const data = {
      nombre: 'Clinica Norte',
      apellido: null,
      email: 'clinica@petcare.test',
      password: 'hashed-password',
      idRol: 2,
      telefono: '3511234567',
      direccion: 'Av. Siempre Viva 123',
    };
    const created = { ...data, rol: { idRol: 2 } } as unknown as User;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await service.create(data);

    expect(repository.create).toHaveBeenCalledWith({
      nombre: data.nombre,
      apellido: null,
      email: data.email,
      password: data.password,
      telefono: data.telefono,
      direccion: data.direccion,
      estado: 'activo',
      idVeterinarioAltaAsistida: null,
      rol: { idRol: data.idRol },
    });
  });

  it('create persists assisted owner state and veterinarian audit id when provided', async () => {
    const data = {
      nombre: 'Laura',
      apellido: 'Gomez',
      email: 'laura@petcare.test',
      password: 'hashed-password',
      idRol: 1,
      estado: 'pendiente_activacion',
      idVeterinarioAltaAsistida: 11,
    };
    const created = { ...data, rol: { idRol: 1 } } as unknown as User;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await service.create(data);

    expect(repository.create).toHaveBeenCalledWith({
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: data.password,
      telefono: null,
      direccion: null,
      estado: 'pendiente_activacion',
      idVeterinarioAltaAsistida: 11,
      rol: { idRol: data.idRol },
    });
  });

  it('update applies partial changes and persists them', async () => {
    const user = {
      idUsuario: 1,
      nombre: 'Simon',
      apellido: 'Breitkopf',
      email: 'simon@petcare.test',
      telefono: null,
    } as User;
    repository.findOne.mockResolvedValueOnce(user);
    repository.save.mockImplementation((value: User) => Promise.resolve(value));

    const result = await service.update(1, { telefono: '3511234567' });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { idUsuario: 1 },
    });
    expect(result.telefono).toBe('3511234567');
    expect(result.nombre).toBe('Simon');
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('update throws NotFoundException when the user does not exist', async () => {
    repository.findOne.mockResolvedValueOnce(null);

    await expect(service.update(999, { nombre: 'X' })).rejects.toThrow(
      NotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('update throws ConflictException when the new email is already taken', async () => {
    const user = {
      idUsuario: 1,
      email: 'simon@petcare.test',
    } as User;
    const otherUser = {
      idUsuario: 2,
      email: 'ocupado@petcare.test',
    } as User;
    repository.findOne
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(otherUser);

    await expect(
      service.update(1, { email: 'ocupado@petcare.test' }),
    ).rejects.toThrow(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('update allows keeping the same email without checking uniqueness', async () => {
    const user = {
      idUsuario: 1,
      email: 'simon@petcare.test',
      nombre: 'Simon',
    } as User;
    repository.findOne.mockResolvedValueOnce(user);
    repository.save.mockImplementation((value: User) => Promise.resolve(value));

    await service.update(1, { email: 'simon@petcare.test' });

    expect(repository.findOne).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('activateIfPending changes pending assisted accounts to active', async () => {
    const user = {
      idUsuario: 1,
      estado: 'pendiente_activacion',
    } as User;
    repository.findOne.mockResolvedValueOnce(user);
    repository.save.mockImplementation((value: User) => Promise.resolve(value));

    const result = await service.activateIfPending(1);

    expect(result.estado).toBe('activo');
    expect(repository.save).toHaveBeenCalledWith(user);
  });
});

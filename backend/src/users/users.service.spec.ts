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
      rol: { idRol: data.idRol },
    });
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(result).toBe(created);
  });
});

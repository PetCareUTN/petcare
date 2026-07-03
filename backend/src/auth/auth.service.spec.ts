import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { RoleName } from '../common/enums/role-name.enum';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock<Promise<User | null>, [string]>;
    create: jest.Mock<Promise<User>, [Parameters<UsersService['create']>[0]]>;
  };
  let rolesRepository: {
    findOne: jest.Mock;
  };

  const defaultRole: Role = { idRol: 1, nombre: RoleName.DUENO_MASCOTA };

  const registerDto: RegisterDto = {
    nombre: 'Simon',
    apellido: 'Breitkopf',
    email: 'simon@petcare.test',
    password: 'ClaveSegura123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    rolesRepository = module.get(getRepositoryToken(Role));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user with the default role and a hashed password', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    rolesRepository.findOne.mockResolvedValue(defaultRole);

    const savedUser: User = {
      idUsuario: 1,
      nombre: registerDto.nombre,
      apellido: registerDto.apellido,
      email: registerDto.email,
      telefono: null as unknown as string,
      password: 'hashed-password',
      fechaRegistro: new Date('2026-07-02T00:00:00.000Z'),
      estado: 'activo',
      rol: defaultRole,
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    };
    usersService.create.mockResolvedValue(savedUser);

    const result = await service.register(registerDto);

    expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
    expect(rolesRepository.findOne).toHaveBeenCalledWith({
      where: { nombre: RoleName.DUENO_MASCOTA },
    });
    expect(usersService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: registerDto.nombre,
        apellido: registerDto.apellido,
        email: registerDto.email,
        idRol: defaultRole.idRol,
      }),
    );

    const createArgs = usersService.create.mock.calls[0][0];
    expect(createArgs.password).not.toBe(registerDto.password);
    expect(
      await bcrypt.compare(registerDto.password, createArgs.password),
    ).toBe(true);

    expect(result).toEqual({
      id_usuario: savedUser.idUsuario,
      nombre: savedUser.nombre,
      apellido: savedUser.apellido,
      email: savedUser.email,
      id_rol: defaultRole.idRol,
      estado: savedUser.estado,
      fecha_registro: savedUser.fechaRegistro,
    });
    expect(
      (result as unknown as { password?: string }).password,
    ).toBeUndefined();
  });

  it('rejects registration when the email is already in use', async () => {
    usersService.findByEmail.mockResolvedValue({} as User);

    await expect(service.register(registerDto)).rejects.toThrow(
      ConflictException,
    );
    expect(usersService.create).not.toHaveBeenCalled();
  });
});

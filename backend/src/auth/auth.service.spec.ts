import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { RoleName } from '../common/enums/role-name.enum';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock<Promise<User | null>, [string]>;
    findById: jest.Mock<Promise<User | null>, [number]>;
    create: jest.Mock<Promise<User>, [Parameters<UsersService['create']>[0]]>;
  };
  let jwtService: {
    signAsync: jest.Mock<Promise<string>, [Record<string, unknown>]>;
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
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
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
    jwtService = module.get(JwtService);
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

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'simon@petcare.test',
      password: 'ClaveSegura123',
    };

    const buildUser = async (): Promise<User> => ({
      idUsuario: 7,
      nombre: 'Simon',
      apellido: 'Breitkopf',
      email: loginDto.email,
      telefono: null as unknown as string,
      password: await bcrypt.hash(loginDto.password, 10),
      fechaRegistro: new Date('2026-07-02T00:00:00.000Z'),
      estado: 'activo',
      rol: defaultRole,
      updatedAt: new Date('2026-07-02T00:00:00.000Z'),
    });

    it('returns a JWT and the public user when credentials are valid', async () => {
      const user = await buildUser();
      usersService.findByEmail.mockResolvedValue(user);
      jwtService.signAsync.mockResolvedValue('signed-jwt');

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      // El token incluye el identificador (sub) y el rol del usuario.
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: user.idUsuario,
          idRol: defaultRole.idRol,
          rol: defaultRole.nombre,
        }),
      );
      expect(result.token).toBe('signed-jwt');
      expect(result.usuario).toEqual({
        id_usuario: user.idUsuario,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        id_rol: defaultRole.idRol,
        estado: user.estado,
        fecha_registro: user.fechaRegistro,
      });
      expect(
        (result.usuario as unknown as { password?: string }).password,
      ).toBeUndefined();
    });

    it('rejects with a generic error when the password is wrong', async () => {
      const user = await buildUser();
      usersService.findByEmail.mockResolvedValue(user);

      await expect(
        service.login({ ...loginDto, password: 'ClaveIncorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('does not reveal whether the account exists when the email is unknown', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});

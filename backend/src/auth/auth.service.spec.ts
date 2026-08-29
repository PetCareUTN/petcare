import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock<Promise<User | null>, [string]>;
    findByDocument: jest.Mock<Promise<User | null>, [string]>;
    findById: jest.Mock<Promise<User | null>, [number]>;
    create: jest.Mock<Promise<User>, [Parameters<UsersService['create']>[0]]>;
    updatePasswordRecoveryData: jest.Mock;
    updatePassword: jest.Mock;
    clearRecoveryData: jest.Mock;
    activateIfPending: jest.Mock;
  };
  let mailService: {
    sendRecoveryCode: jest.Mock;
    sendAssistedOwnerActivationCode: jest.Mock;
  };
  let jwtService: {
    signAsync: jest.Mock<Promise<string>, [Record<string, unknown>]>;
  };
  let rolesRepository: {
    findOne: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };

  const defaultRole: Role = { idRol: 1, nombre: RoleName.DUENO_MASCOTA };
  const vetRole: Role = { idRol: 2, nombre: RoleName.VETERINARIO };

  const registerDto: RegisterDto = {
    nombre: 'Simon',
    apellido: 'Breitkopf',
    numeroDocumento: '30111222',
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
            findByDocument: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updatePasswordRecoveryData: jest.fn(),
            updatePassword: jest.fn(),
            clearRecoveryData: jest.fn(),
            activateIfPending: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendRecoveryCode: jest.fn(),
            sendAssistedOwnerActivationCode: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    mailService = module.get(MailService);
    rolesRepository = module.get(getRepositoryToken(Role));
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers a user with the default role and a hashed password', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByDocument.mockResolvedValue(null);
    rolesRepository.findOne.mockResolvedValue(defaultRole);

    const savedUser: User = {
      idUsuario: 1,
      nombre: registerDto.nombre,
      apellido: registerDto.apellido,
      email: registerDto.email,
      numeroDocumento: registerDto.numeroDocumento,
      telefono: null,
      direccion: null,
      password: 'hashed-password',
      fechaRegistro: new Date('2026-07-02T00:00:00.000Z'),
      estado: 'activo',
      idVeterinarioAltaAsistida: null,
      rol: defaultRole,
      mascotas: [],
      codigoRecuperacion: null,
      fechaExpiracionCodigo: null,
      emailNuevo: null,
      codigoCambioEmail: null,
      fechaExpiracionCodigoEmail: null,
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
        numeroDocumento: registerDto.numeroDocumento,
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

  it('rejects registration when the DNI is already in use', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByDocument.mockResolvedValue({} as User);

    await expect(service.register(registerDto)).rejects.toThrow(
      ConflictException,
    );
    expect(usersService.create).not.toHaveBeenCalled();
  });

  describe('createAssistedOwner', () => {
    const dto = {
      nombre: ' Laura ',
      apellido: ' Gomez ',
      email: 'LAURA@PETCARE.TEST',
      numeroDocumento: ' 30111222 ',
      telefono: ' 3511234567 ',
    };

    const veterinarian = {
      idVeterinario: 11,
      estadoValidacion: ValidationStatus.APROBADO,
    } as Veterinario;

    const savedUser: User = {
      idUsuario: 22,
      nombre: 'Laura',
      apellido: 'Gomez',
      email: 'laura@petcare.test',
      numeroDocumento: '30111222',
      telefono: '3511234567',
      direccion: null,
      password: 'temporary-hash',
      fechaRegistro: new Date('2026-08-07T00:00:00.000Z'),
      estado: 'pendiente_activacion',
      idVeterinarioAltaAsistida: veterinarian.idVeterinario,
      rol: defaultRole,
      mascotas: [],
      codigoRecuperacion: null,
      fechaExpiracionCodigo: null,
      emailNuevo: null,
      codigoCambioEmail: null,
      fechaExpiracionCodigoEmail: null,
      updatedAt: new Date('2026-08-07T00:00:00.000Z'),
    };

    it('creates a pending owner and sends an activation code by email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByDocument.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(defaultRole);
      veterinariosRepository.findOne.mockResolvedValue(veterinarian);
      usersService.create.mockResolvedValue(savedUser);

      const result = await service.createAssistedOwner(dto, 5);

      expect(usersService.findByEmail).toHaveBeenCalledWith(
        'laura@petcare.test',
      );
      expect(usersService.findByDocument).toHaveBeenCalledWith('30111222');
      expect(veterinariosRepository.findOne).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: 5 } },
      });
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Laura',
          apellido: 'Gomez',
          email: 'laura@petcare.test',
          numeroDocumento: '30111222',
          telefono: '3511234567',
          idRol: defaultRole.idRol,
          estado: 'pendiente_activacion',
          idVeterinarioAltaAsistida: veterinarian.idVeterinario,
        }),
      );
      const createArgs = usersService.create.mock.calls[0][0];
      expect(createArgs.password).not.toBe('');
      expect(createArgs.password).not.toBe(dto.email);
      expect(usersService.updatePasswordRecoveryData).toHaveBeenCalledWith(
        savedUser.idUsuario,
        expect.any(String),
        expect.any(Date),
      );
      expect(mailService.sendAssistedOwnerActivationCode).toHaveBeenCalledWith(
        savedUser.email,
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result.usuario).toEqual(
        expect.objectContaining({
          id_usuario: savedUser.idUsuario,
          email: savedUser.email,
          estado: 'pendiente_activacion',
        }),
      );
      expect(
        (result.usuario as unknown as { password?: string }).password,
      ).toBeUndefined();
    });

    it('rejects assisted owner creation when the email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(savedUser);

      await expect(service.createAssistedOwner(dto, 5)).rejects.toThrow(
        ConflictException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
      expect(mailService.sendAssistedOwnerActivationCode).not.toHaveBeenCalled();
    });

    it('rejects assisted owner creation when the veterinarian is not approved', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(defaultRole);
      usersService.findByDocument.mockResolvedValue(null);
      veterinariosRepository.findOne.mockResolvedValue({
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      await expect(service.createAssistedOwner(dto, 5)).rejects.toThrow(
        ForbiddenException,
      );
      expect(usersService.create).not.toHaveBeenCalled();
      expect(mailService.sendAssistedOwnerActivationCode).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'simon@petcare.test',
      password: 'ClaveSegura123',
    };

    const buildUser = async (rol: Role = defaultRole): Promise<User> => ({
      idUsuario: 7,
      nombre: 'Simon',
      apellido: 'Breitkopf',
      email: loginDto.email,
      numeroDocumento: null,
      telefono: null,
      direccion: null,
      password: await bcrypt.hash(loginDto.password, 10),
      fechaRegistro: new Date('2026-07-02T00:00:00.000Z'),
      estado: 'activo',
      idVeterinarioAltaAsistida: null,
      rol,
      mascotas: [],
      codigoRecuperacion: null,
      fechaExpiracionCodigo: null,
      emailNuevo: null,
      codigoCambioEmail: null,
      fechaExpiracionCodigoEmail: null,
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
        numero_documento: null,
        telefono: null,
        direccion: null,
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

    it('blocks a veterinario account with a pending validation request', async () => {
      const user = await buildUser(vetRole);
      usersService.findByEmail.mockResolvedValue(user);
      veterinariosRepository.findOne.mockResolvedValue({
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('blocks a veterinario account that never requested validation', async () => {
      const user = await buildUser(vetRole);
      usersService.findByEmail.mockResolvedValue(user);
      veterinariosRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('blocks a veterinario account that was rejected', async () => {
      const user = await buildUser(vetRole);
      usersService.findByEmail.mockResolvedValue(user);
      veterinariosRepository.findOne.mockResolvedValue({
        estadoValidacion: ValidationStatus.RECHAZADO,
        motivoRechazo: 'Matrícula vencida',
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        ForbiddenException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('allows a veterinario account that was approved', async () => {
      const user = await buildUser(vetRole);
      usersService.findByEmail.mockResolvedValue(user);
      veterinariosRepository.findOne.mockResolvedValue({
        estadoValidacion: ValidationStatus.APROBADO,
      });
      jwtService.signAsync.mockResolvedValue('signed-jwt');

      const result = await service.login(loginDto);

      expect(result.token).toBe('signed-jwt');
    });
  });

  describe('resetPassword', () => {
    it('activates a pending assisted owner after setting a new password', async () => {
      const recoveryCode = '123456';
      const user: User = {
        idUsuario: 33,
        nombre: 'Laura',
        apellido: 'Gomez',
        email: 'laura@petcare.test',
        numeroDocumento: '30111222',
        telefono: null,
        direccion: null,
        password: 'temporary-hash',
        fechaRegistro: new Date('2026-08-07T00:00:00.000Z'),
        estado: 'pendiente_activacion',
        idVeterinarioAltaAsistida: 11,
        rol: defaultRole,
        mascotas: [],
        codigoRecuperacion: await bcrypt.hash(recoveryCode, 10),
        fechaExpiracionCodigo: new Date(Date.now() + 10 * 60 * 1000),
        emailNuevo: null,
        codigoCambioEmail: null,
        fechaExpiracionCodigoEmail: null,
        updatedAt: new Date('2026-08-07T00:00:00.000Z'),
      };
      usersService.findByEmail.mockResolvedValue(user);

      await service.resetPassword({
        email: user.email,
        codigo: recoveryCode,
        nuevaContraseña: 'NuevaClave123',
      });

      expect(usersService.updatePassword).toHaveBeenCalledWith(
        user.idUsuario,
        expect.any(String),
      );
      expect(usersService.activateIfPending).toHaveBeenCalledWith(
        user.idUsuario,
      );
      expect(usersService.clearRecoveryData).toHaveBeenCalledWith(
        user.idUsuario,
      );
    });
  });
});

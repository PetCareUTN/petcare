import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    })
      // El guard JWT depende de JwtService; en el test de unidad del
      // controlador lo reemplazamos por uno que siempre permite el acceso.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates registration to AuthService', async () => {
    const dto: RegisterDto = {
      nombre: 'Simon',
      apellido: 'Breitkopf',
      email: 'simon@petcare.test',
      password: 'ClaveSegura123',
    };
    const response: RegisterResponseDto = {
      id_usuario: 1,
      nombre: dto.nombre,
      apellido: dto.apellido,
      email: dto.email,
      id_rol: 1,
      estado: 'activo',
      fecha_registro: new Date('2026-07-02T00:00:00.000Z'),
    };
    authService.register.mockResolvedValue(response);

    await expect(controller.register(dto)).resolves.toEqual(response);
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('delegates login to AuthService', async () => {
    const dto: LoginDto = {
      email: 'simon@petcare.test',
      password: 'ClaveSegura123',
    };
    const response: LoginResponseDto = {
      token: 'signed-jwt',
      usuario: {
        id_usuario: 1,
        nombre: 'Simon',
        apellido: 'Breitkopf',
        email: dto.email,
        id_rol: 1,
        estado: 'activo',
        fecha_registro: new Date('2026-07-02T00:00:00.000Z'),
      },
    };
    authService.login.mockResolvedValue(response);

    await expect(controller.login(dto)).resolves.toEqual(response);
    expect(authService.login).toHaveBeenCalledWith(dto);
  });
});

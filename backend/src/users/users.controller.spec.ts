import { Test, TestingModule } from '@nestjs/testing';
import { RoleName } from '../common/enums/role-name.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: { update: jest.Mock };

  const currentUser: JwtPayload = {
    sub: 1,
    email: 'simon@petcare.test',
    idRol: 1,
    rol: RoleName.DUENO_MASCOTA,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            update: jest.fn(),
          },
        },
      ],
    })
      // El guard JWT depende de JwtService; en el test de unidad del
      // controlador lo reemplazamos por uno que siempre permite el acceso.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('updateMe updates the authenticated user and returns the public shape', async () => {
    const updatedUser = {
      idUsuario: 1,
      nombre: 'Simon',
      apellido: 'Breitkopf',
      email: 'simon@petcare.test',
      telefono: '3511234567',
      estado: 'activo',
      fechaRegistro: new Date('2026-01-01'),
      rol: { idRol: 1 },
    } as User;
    usersService.update.mockResolvedValue(updatedUser);

    const result = await controller.updateMe(currentUser, {
      telefono: '3511234567',
    });

    expect(usersService.update).toHaveBeenCalledWith(1, {
      telefono: '3511234567',
    });
    expect(result).toMatchObject({
      id_usuario: 1,
      telefono: '3511234567',
      email: 'simon@petcare.test',
    });
  });
});

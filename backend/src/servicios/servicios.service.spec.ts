import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { User } from '../users/entities/user.entity';
import { DisponibilidadServicio } from './entities/disponibilidad-servicio.entity';
import { Servicio } from './entities/servicio.entity';
import { ServiciosService } from './servicios.service';

describe('ServiciosService', () => {
  let service: ServiciosService;
  let serviciosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let disponibilidadesRepository: {
    delete: jest.Mock;
  };
  let usersRepository: {
    findOne: jest.Mock;
  };

  const propietario = {
    idUsuario: 1,
    rol: { idRol: 2, nombre: RoleName.VETERINARIO },
  } as User;
  const otroUsuario = { idUsuario: 2 } as User;

  const buildServicio = (overrides: Partial<Servicio> = {}): Servicio =>
    ({
      idServicio: 10,
      usuario: propietario,
      categoria: CategoriaServicio.PELUQUERIA,
      descripcion: null,
      disponibilidades: [
        {
          idDisponibilidad: 1,
          diaSemana: DiaSemana.LUNES,
          horaInicio: '09:00',
          horaFin: '12:00',
        } as DisponibilidadServicio,
      ],
      ...overrides,
    }) as Servicio;

  const disponibilidadValida = {
    diaSemana: DiaSemana.LUNES,
    horaInicio: '09:00',
    horaFin: '12:00',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiciosService,
        {
          provide: getRepositoryToken(Servicio),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DisponibilidadServicio),
          useValue: {
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ServiciosService>(ServiciosService);
    serviciosRepository = module.get(getRepositoryToken(Servicio));
    disponibilidadesRepository = module.get(
      getRepositoryToken(DisponibilidadServicio),
    );
    usersRepository = module.get(getRepositoryToken(User));
  });

  describe('create', () => {
    it('creates a servicio with its disponibilidades', async () => {
      usersRepository.findOne.mockResolvedValue(propietario);
      serviciosRepository.create.mockImplementation(
        (entity: Partial<Servicio>) => entity as Servicio,
      );
      serviciosRepository.save.mockImplementation((entity) =>
        Promise.resolve({ ...entity, idServicio: 10 }),
      );

      const result = await service.create(propietario.idUsuario, {
        categoria: CategoriaServicio.PELUQUERIA,
        disponibilidades: [disponibilidadValida],
      });

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { idUsuario: propietario.idUsuario },
      });
      expect(result.idServicio).toBe(10);
      expect(result.categoria).toBe(CategoriaServicio.PELUQUERIA);
      expect(result.disponibilidades).toHaveLength(1);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create(999, {
          categoria: CategoriaServicio.PASEADOR,
          disponibilidades: [disponibilidadValida],
        }),
      ).rejects.toThrow(NotFoundException);
      expect(serviciosRepository.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when horaInicio is not before horaFin', async () => {
      usersRepository.findOne.mockResolvedValue(propietario);

      await expect(
        service.create(propietario.idUsuario, {
          categoria: CategoriaServicio.PASEADOR,
          disponibilidades: [
            { diaSemana: DiaSemana.LUNES, horaInicio: '12:00', horaFin: '09:00' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(serviciosRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findMine', () => {
    it('returns only the requesting user\'s servicios', async () => {
      serviciosRepository.find.mockResolvedValue([buildServicio()]);

      const result = await service.findMine(propietario.idUsuario);

      expect(serviciosRepository.find).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: propietario.idUsuario } },
        relations: ['usuario'],
        order: { idServicio: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findAll', () => {
    it('filters by categoria when provided', async () => {
      serviciosRepository.find.mockResolvedValue([buildServicio()]);

      await service.findAll(CategoriaServicio.PELUQUERIA);

      expect(serviciosRepository.find).toHaveBeenCalledWith({
        where: { categoria: CategoriaServicio.PELUQUERIA },
        relations: ['usuario'],
        order: { idServicio: 'ASC' },
      });
    });

    it('returns all servicios when no categoria filter is given', async () => {
      serviciosRepository.find.mockResolvedValue([buildServicio()]);

      await service.findAll();

      expect(serviciosRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: ['usuario'],
        order: { idServicio: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the servicio does not exist', async () => {
      serviciosRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('returns the servicio when it exists', async () => {
      serviciosRepository.findOne.mockResolvedValue(buildServicio());

      const result = await service.findOne(10);

      expect(result.idServicio).toBe(10);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the servicio does not exist', async () => {
      serviciosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(999, propietario.idUsuario, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the requester is not the owner', async () => {
      serviciosRepository.findOne.mockResolvedValue(buildServicio());

      await expect(
        service.update(10, otroUsuario.idUsuario, {
          categoria: CategoriaServicio.PASEADOR,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('applies only the provided fields', async () => {
      const servicio = buildServicio();
      serviciosRepository.findOne.mockResolvedValue(servicio);
      serviciosRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(10, propietario.idUsuario, {
        categoria: CategoriaServicio.PASEADOR,
      });

      expect(serviciosRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria: CategoriaServicio.PASEADOR,
        }),
      );
      expect(result.categoria).toBe(CategoriaServicio.PASEADOR);
    });

    it('replaces disponibilidades when provided', async () => {
      const servicio = buildServicio();
      serviciosRepository.findOne.mockResolvedValue(servicio);
      serviciosRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const result = await service.update(10, propietario.idUsuario, {
        disponibilidades: [
          { diaSemana: DiaSemana.MARTES, horaInicio: '10:00', horaFin: '14:00' },
        ],
      });

      expect(result.disponibilidades).toHaveLength(1);
      expect(result.disponibilidades[0].diaSemana).toBe(DiaSemana.MARTES);
    });

    it('throws BadRequestException when the new disponibilidades are invalid', async () => {
      const servicio = buildServicio();
      serviciosRepository.findOne.mockResolvedValue(servicio);

      await expect(
        service.update(10, propietario.idUsuario, {
          disponibilidades: [
            { diaSemana: DiaSemana.MARTES, horaInicio: '14:00', horaFin: '10:00' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(serviciosRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the servicio does not exist', async () => {
      serviciosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.remove(999, propietario.idUsuario),
      ).rejects.toThrow(NotFoundException);
      expect(serviciosRepository.remove).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the requester is not the owner', async () => {
      serviciosRepository.findOne.mockResolvedValue(buildServicio());

      await expect(
        service.remove(10, otroUsuario.idUsuario),
      ).rejects.toThrow(ForbiddenException);
      expect(serviciosRepository.remove).not.toHaveBeenCalled();
    });

    it('removes the servicio when the requester is the owner', async () => {
      const servicio = buildServicio();
      serviciosRepository.findOne.mockResolvedValue(servicio);

      await service.remove(10, propietario.idUsuario);

      expect(serviciosRepository.remove).toHaveBeenCalledWith(servicio);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { VeterinariosService } from './veterinarios.service';
import { Veterinario } from './entities/veterinario.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { SuscripcionEstado } from '../common/enums/suscripcion-estado.enum';
import { Suscripcion } from '../suscripciones/entities/suscripcion.entity';
import { RegisterVeterinarioDto } from './dto/register-veterinario.dto';
import { GeocodingService } from '../geocoding/geocoding.service';

describe('VeterinariosService', () => {
  let service: VeterinariosService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let rolesRepository: {
    findOne: jest.Mock;
  };
  let usersService: {
    findByEmail: jest.Mock;
    create: jest.Mock;
  };
  let notificacionesService: {
    crear: jest.Mock;
  };
  let geocodingService: {
    geocodificar: jest.Mock;
  };
  let suscripcionesRepository: {
    findOne: jest.Mock;
  };

  const mockFile = {
    path: 'C:\\uploads\\matriculas\\test.pdf',
    filename: 'test.pdf',
  } as Express.Multer.File;

  const mockHabilitacionFile = {
    path: 'C:\\uploads\\habilitaciones\\test.pdf',
    filename: 'habilitacion-test.pdf',
  } as Express.Multer.File;

  const registroDto: RegisterVeterinarioDto = {
    nombre: 'Clinica Norte',
    email: 'clinica@petcare.test',
    password: 'ClaveSegura123',
    telefono: '3511234567',
    direccion: 'Av. Siempre Viva 123',
    numeroDocumento: '12345678',
    numeroMatricula: 'MAT-001',
    provinciaMatricula: 'Buenos Aires',
  };

  const vetRole: Role = { idRol: 2, nombre: RoleName.VETERINARIO };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    rolesRepository = { findOne: jest.fn() };
    usersService = { findByEmail: jest.fn(), create: jest.fn() };
    notificacionesService = { crear: jest.fn() };
    geocodingService = { geocodificar: jest.fn().mockResolvedValue(null) };
    suscripcionesRepository = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VeterinariosService,
        { provide: getRepositoryToken(Veterinario), useValue: repository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        {
          provide: getRepositoryToken(Suscripcion),
          useValue: suscripcionesRepository,
        },
        { provide: UsersService, useValue: usersService },
        { provide: NotificacionesService, useValue: notificacionesService },
        { provide: GeocodingService, useValue: geocodingService },
      ],
    }).compile();

    service = module.get<VeterinariosService>(VeterinariosService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listarAprobados', () => {
    it('devuelve solo las veterinarias aprobadas, ordenadas por nombre', async () => {
      repository.find.mockResolvedValue([
        {
          idVeterinario: 2,
          usuario: {
            nombre: 'Veterinaria Zeta',
            direccion: 'Calle 2',
            latitud: -31.42,
            longitud: -64.18,
            telefono: '+5493511111111',
          },
        },
        {
          idVeterinario: 1,
          usuario: {
            nombre: 'Veterinaria Alfa',
            direccion: 'Calle 1',
            latitud: null,
            longitud: null,
            telefono: null,
          },
        },
      ]);

      const result = await service.listarAprobados();

      expect(repository.find).toHaveBeenCalledWith({
        where: { estadoValidacion: ValidationStatus.APROBADO },
        relations: ['usuario'],
      });
      expect(result).toEqual([
        {
          idVeterinario: 1,
          nombre: 'Veterinaria Alfa',
          direccion: 'Calle 1',
          latitud: null,
          longitud: null,
          telefono: null,
        },
        {
          idVeterinario: 2,
          nombre: 'Veterinaria Zeta',
          direccion: 'Calle 2',
          latitud: -31.42,
          longitud: -64.18,
          telefono: '+5493511111111',
        },
      ]);
    });
  });

  describe('registrarVeterinario', () => {
    it('crea el usuario con rol veterinario y la solicitud de validación pendiente', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(vetRole);
      const usuarioCreado = { idUsuario: 1 } as User;
      usersService.create.mockResolvedValue(usuarioCreado);
      const veterinarioCreado = {
        idVeterinario: 1,
        estadoValidacion: ValidationStatus.PENDIENTE,
      };
      repository.create.mockReturnValue(veterinarioCreado);
      repository.save.mockResolvedValue(veterinarioCreado);
      notificacionesService.crear.mockResolvedValue({});

      const result = await service.registrarVeterinario(
        registroDto,
        mockFile,
        mockHabilitacionFile,
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith(registroDto.email);
      expect(rolesRepository.findOne).toHaveBeenCalledWith({
        where: { nombre: RoleName.VETERINARIO },
      });
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: registroDto.nombre,
          apellido: null,
          email: registroDto.email,
          idRol: vetRole.idRol,
          telefono: registroDto.telefono,
          direccion: registroDto.direccion,
        }),
      );
      const createArgs = usersService.create.mock.calls[0][0];
      expect(createArgs.password).not.toBe(registroDto.password);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          usuario: usuarioCreado,
          numeroDocumento: registroDto.numeroDocumento,
          numeroMatricula: registroDto.numeroMatricula,
          provinciaMatricula: registroDto.provinciaMatricula,
          estadoValidacion: ValidationStatus.PENDIENTE,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(notificacionesService.crear).toHaveBeenCalled();
      expect(result.mensaje).toBeDefined();
    });

    it('debería lanzar BadRequestException si no se envía archivo', async () => {
      await expect(
        service.registrarVeterinario(
          registroDto,
          undefined as any,
          undefined as any,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el email ya está registrado', async () => {
      usersService.findByEmail.mockResolvedValue({ idUsuario: 5 });

      await expect(
        service.registrarVeterinario(
          registroDto,
          mockFile,
          mockHabilitacionFile,
        ),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('lanza un error si no existe el rol veterinario en el seed', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registrarVeterinario(
          registroDto,
          mockFile,
          mockHabilitacionFile,
        ),
      ).rejects.toThrow('No se encontró el rol "veterinario"');
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('aprobar', () => {
    it('debería aprobar una solicitud pendiente', async () => {
      const veterinario = {
        idVeterinario: 1,
        estadoValidacion: ValidationStatus.PENDIENTE,
        usuario: { idUsuario: 1 },
      };
      repository.findOne.mockResolvedValue(veterinario);
      repository.save.mockResolvedValue(veterinario);
      notificacionesService.crear.mockResolvedValue({});

      const result = await service.aprobar(1);

      expect(veterinario.estadoValidacion).toBe(ValidationStatus.APROBADO);
      expect(repository.save).toHaveBeenCalled();
      expect(result.mensaje).toBe('Solicitud aprobada correctamente');
    });

    it('debería lanzar ConflictException si la solicitud no está pendiente', async () => {
      const veterinario = {
        idVeterinario: 1,
        estadoValidacion: ValidationStatus.APROBADO,
        usuario: { idUsuario: 1 },
      };
      repository.findOne.mockResolvedValue(veterinario);

      await expect(service.aprobar(1)).rejects.toThrow(ConflictException);
    });

    it('debería lanzar NotFoundException si no existe la solicitud', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.aprobar(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rechazar', () => {
    it('debería rechazar una solicitud pendiente y guardar el motivo', async () => {
      const veterinario = {
        idVeterinario: 1,
        estadoValidacion: ValidationStatus.PENDIENTE,
        usuario: { idUsuario: 1 },
      };
      repository.findOne.mockResolvedValue(veterinario);
      repository.save.mockResolvedValue(veterinario);
      notificacionesService.crear.mockResolvedValue({});

      const result = await service.rechazar(1, 'Documentación incompleta');

      expect(veterinario.estadoValidacion).toBe(ValidationStatus.RECHAZADO);
      expect(veterinario.motivoRechazo).toBe('Documentación incompleta');
      expect(repository.save).toHaveBeenCalled();
      expect(result.mensaje).toBe('Solicitud rechazada correctamente');
    });

    it('debería lanzar ConflictException si la solicitud no está pendiente', async () => {
      const veterinario = {
        idVeterinario: 1,
        estadoValidacion: ValidationStatus.RECHAZADO,
        usuario: { idUsuario: 1 },
      };
      repository.findOne.mockResolvedValue(veterinario);

      await expect(service.rechazar(1, 'Motivo')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('obtenerDetalle', () => {
    const veterinarioAprobado = {
      idVeterinario: 1,
      numeroDocumento: '30111222',
      numeroMatricula: 'MAT-1',
      provinciaMatricula: 'Buenos Aires',
      habilitacionUrl: null,
      estadoValidacion: ValidationStatus.APROBADO,
      motivoRechazo: null,
      createdAt: new Date('2026-01-01'),
      usuario: {
        idUsuario: 10,
        nombre: 'Ana',
        apellido: 'Perez',
        email: 'ana@petcare.test',
      },
    };

    it('aprobado + suscripción activa: estadoValidacion en minúsculas y estadoReal activa', async () => {
      repository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue({
        estado: SuscripcionEstado.ACTIVA,
      });

      const detalle = await service.obtenerDetalle(1);

      expect(detalle.estadoValidacion).toBe('aprobado');
      expect(detalle.estadoReal).toBe('activa');
      expect(suscripcionesRepository.findOne).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: 10 } },
      });
    });

    it('aprobado sin suscripción: estadoReal pendiente_pago', async () => {
      repository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue(null);

      const detalle = await service.obtenerDetalle(1);

      expect(detalle.estadoReal).toBe('pendiente_pago');
    });

    it('aprobado + suscripción pendiente de pago: estadoReal pendiente_pago', async () => {
      repository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue({
        estado: SuscripcionEstado.PENDIENTE_PAGO,
      });

      const detalle = await service.obtenerDetalle(1);

      expect(detalle.estadoReal).toBe('pendiente_pago');
    });

    it('validación pendiente: estadoReal pendiente_validacion', async () => {
      repository.findOne.mockResolvedValue({
        ...veterinarioAprobado,
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      const detalle = await service.obtenerDetalle(1);

      expect(detalle.estadoValidacion).toBe('pendiente');
      expect(detalle.estadoReal).toBe('pendiente_validacion');
    });

    it('validación rechazada: estadoReal rechazado', async () => {
      repository.findOne.mockResolvedValue({
        ...veterinarioAprobado,
        estadoValidacion: ValidationStatus.RECHAZADO,
        motivoRechazo: 'Documentación inválida',
      });

      const detalle = await service.obtenerDetalle(1);

      expect(detalle.estadoValidacion).toBe('rechazado');
      expect(detalle.estadoReal).toBe('rechazado');
    });

    it('debería lanzar NotFoundException si no existe la solicitud', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.obtenerDetalle(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

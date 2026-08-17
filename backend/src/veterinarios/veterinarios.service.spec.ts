import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VeterinariosService } from './veterinarios.service';
import { Veterinario } from './entities/veterinario.entity';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { RegisterVeterinarioDto } from './dto/register-veterinario.dto';

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

  const mockFile = {
    path: 'C:\\uploads\\matriculas\\test.pdf',
    filename: 'test.pdf',
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VeterinariosService,
        { provide: getRepositoryToken(Veterinario), useValue: repository },
        { provide: getRepositoryToken(Role), useValue: rolesRepository },
        { provide: UsersService, useValue: usersService },
        { provide: NotificacionesService, useValue: notificacionesService },
      ],
    }).compile();

    service = module.get<VeterinariosService>(VeterinariosService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
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

      const result = await service.registrarVeterinario(registroDto, mockFile);

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
        service.registrarVeterinario(registroDto, undefined as any),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el email ya está registrado', async () => {
      usersService.findByEmail.mockResolvedValue({ idUsuario: 5 } as User);

      await expect(
        service.registrarVeterinario(registroDto, mockFile),
      ).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('lanza un error si no existe el rol veterinario en el seed', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      rolesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registrarVeterinario(registroDto, mockFile),
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

      await expect(service.rechazar(1, 'Motivo')).rejects.toThrow(ConflictException);
    });
  });
});

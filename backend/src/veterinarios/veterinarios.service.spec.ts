import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VeterinariosService } from './veterinarios.service';
import { Veterinario } from './entities/veterinario.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ValidationStatus } from '../common/enums/validation-status.enum';

describe('VeterinariosService', () => {
  let service: VeterinariosService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let notificacionesService: {
    crear: jest.Mock;
  };

  const mockFile = {
    path: 'C:\\uploads\\matriculas\\test.pdf',
    filename: 'test.pdf',
  } as Express.Multer.File;

  const mockBody = {
    numeroDocumento: '12345678',
    numeroMatricula: 'MAT-001',
    provinciaMatricula: 'Buenos Aires',
  };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    notificacionesService = { crear: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VeterinariosService,
        { provide: getRepositoryToken(Veterinario), useValue: repository },
        { provide: NotificacionesService, useValue: notificacionesService },
      ],
    }).compile();

    service = module.get<VeterinariosService>(VeterinariosService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crearSolicitud', () => {
    it('debería crear una solicitud nueva cuando no existe registro previo', async () => {
      repository.findOne.mockResolvedValue(null);
      const created = { idVeterinario: 1, estadoValidacion: ValidationStatus.PENDIENTE };
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);
      notificacionesService.crear.mockResolvedValue({});

      const result = await service.crearSolicitud(1, mockBody, mockFile);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          numeroDocumento: '12345678',
          numeroMatricula: 'MAT-001',
          provinciaMatricula: 'Buenos Aires',
          estadoValidacion: ValidationStatus.PENDIENTE,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(notificacionesService.crear).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('debería lanzar ConflictException si ya existe solicitud pendiente', async () => {
      const existente = { idVeterinario: 1, estadoValidacion: ValidationStatus.PENDIENTE };
      repository.findOne.mockResolvedValue(existente);

      await expect(service.crearSolicitud(1, mockBody, mockFile)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería actualizar registro existente si fue rechazado', async () => {
      const existente = {
        idVeterinario: 1,
        estadoValidacion: ValidationStatus.RECHAZADO,
        numeroDocumento: '00000000',
        numeroMatricula: 'OLD',
        provinciaMatricula: 'Old',
        matriculaUrl: 'old.pdf',
        motivoRechazo: 'Motivo viejo',
      };
      repository.findOne.mockResolvedValue(existente);
      repository.save.mockResolvedValue({ ...existente, estadoValidacion: ValidationStatus.PENDIENTE });
      notificacionesService.crear.mockResolvedValue({});

      const result = await service.crearSolicitud(1, mockBody, mockFile);

      expect(existente.numeroDocumento).toBe('12345678');
      expect(existente.estadoValidacion).toBe(ValidationStatus.PENDIENTE);
      expect(existente.motivoRechazo).toBeNull();
      expect(repository.save).toHaveBeenCalled();
      expect(notificacionesService.crear).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si no se envía archivo', async () => {
      await expect(service.crearSolicitud(1, mockBody, undefined as any)).rejects.toThrow(
        BadRequestException,
      );
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

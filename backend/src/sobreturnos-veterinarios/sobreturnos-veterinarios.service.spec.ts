import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { SobreturnoVeterinario } from './entities/sobreturno-veterinario.entity';
import { SobreturnosVeterinariosService } from './sobreturnos-veterinarios.service';

describe('SobreturnosVeterinariosService', () => {
  let service: SobreturnosVeterinariosService;
  let sobreturnosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };

  const veterinario = {
    idVeterinario: 7,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SobreturnosVeterinariosService,
        {
          provide: getRepositoryToken(SobreturnoVeterinario),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
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

    service = module.get<SobreturnosVeterinariosService>(
      SobreturnosVeterinariosService,
    );
    sobreturnosRepository = module.get(getRepositoryToken(SobreturnoVeterinario));
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
  });

  describe('crear', () => {
    const dto = { fecha: '2099-01-15', hora: '22:00', cupos: 2 };

    it('crea un sobreturno para la veterinaria validada', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.findOne.mockResolvedValue(null);
      const creado = { idSobreturno: 1, veterinario, ...dto };
      sobreturnosRepository.create.mockReturnValue(creado);
      sobreturnosRepository.save.mockResolvedValue(creado);

      const result = await service.crear(99, dto);

      expect(sobreturnosRepository.create).toHaveBeenCalledWith({
        veterinario,
        fecha: dto.fecha,
        hora: dto.hora,
        cupos: dto.cupos,
      });
      expect(result).toEqual({
        idSobreturno: 1,
        idVeterinario: 7,
        fecha: dto.fecha,
        hora: dto.hora,
        cupos: dto.cupos,
      });
    });

    it('usa un cupo por defecto cuando no se especifica', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.findOne.mockResolvedValue(null);
      const dtoSinCupos = { fecha: '2099-01-15', hora: '22:00' };
      const creado = { idSobreturno: 2, veterinario, ...dtoSinCupos, cupos: 1 };
      sobreturnosRepository.create.mockReturnValue(creado);
      sobreturnosRepository.save.mockResolvedValue(creado);

      await service.crear(99, dtoSinCupos as any);

      expect(sobreturnosRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ cupos: 1 }),
      );
    });

    it('rechaza crear un sobreturno en una fecha pasada', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);

      await expect(
        service.crear(99, { ...dto, fecha: '2000-01-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(sobreturnosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un sobreturno duplicado para la misma fecha y hora', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.findOne.mockResolvedValue({ idSobreturno: 5 });

      await expect(service.crear(99, dto)).rejects.toMatchObject({
        response: {
          codigoEstado: 409,
          mensaje:
            'Ya existe un sobreturno para esa fecha y hora. Eliminalo antes de cargar otro',
        },
      });
      expect(sobreturnosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza cuando el usuario no es un veterinario validado', async () => {
      veterinariosRepository.findOne.mockResolvedValue(null);

      await expect(service.crear(99, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listarMios', () => {
    it('lista los sobreturnos de la veterinaria validada ordenados por fecha y hora', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.find.mockResolvedValue([
        { idSobreturno: 1, veterinario, fecha: '2099-01-15', hora: '22:00', cupos: 1 },
      ]);

      const result = await service.listarMios(99);

      expect(sobreturnosRepository.find).toHaveBeenCalledWith({
        where: { veterinario: { idVeterinario: 7 } },
        relations: ['veterinario'],
        order: { fecha: 'ASC', hora: 'ASC' },
      });
      expect(result).toEqual([
        { idSobreturno: 1, idVeterinario: 7, fecha: '2099-01-15', hora: '22:00', cupos: 1 },
      ]);
    });

    it('filtra por fecha cuando se indica', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.find.mockResolvedValue([]);

      await service.listarMios(99, '2099-01-15');

      expect(sobreturnosRepository.find).toHaveBeenCalledWith({
        where: { veterinario: { idVeterinario: 7 }, fecha: '2099-01-15' },
        relations: ['veterinario'],
        order: { fecha: 'ASC', hora: 'ASC' },
      });
    });
  });

  describe('eliminar', () => {
    it('permite al veterinario dueño eliminar su sobreturno', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.findOne.mockResolvedValue({
        idSobreturno: 1,
        veterinario,
      });

      await service.eliminar(99, 1);

      expect(sobreturnosRepository.remove).toHaveBeenCalledWith({
        idSobreturno: 1,
        veterinario,
      });
    });

    it('rechaza eliminar un sobreturno inexistente', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.findOne.mockResolvedValue(null);

      await expect(service.eliminar(99, 1)).rejects.toThrow(NotFoundException);
    });

    it('rechaza eliminar un sobreturno de otra veterinaria', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      sobreturnosRepository.findOne.mockResolvedValue({
        idSobreturno: 1,
        veterinario: { idVeterinario: 999 },
      });

      await expect(service.eliminar(99, 1)).rejects.toThrow(ForbiddenException);
      expect(sobreturnosRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('obtenerCuposExtraPorHora', () => {
    it('suma los cupos de sobreturnos que caen en la misma hora', async () => {
      sobreturnosRepository.find.mockResolvedValue([
        { hora: '22:00:00', cupos: 1 },
        { hora: '22:00:00', cupos: 2 },
        { hora: '23:00:00', cupos: 1 },
      ]);

      const result = await service.obtenerCuposExtraPorHora(7, '2099-01-15');

      expect(sobreturnosRepository.find).toHaveBeenCalledWith({
        where: { veterinario: { idVeterinario: 7 }, fecha: '2099-01-15' },
      });
      expect(result).toEqual(
        new Map([
          ['22:00', 3],
          ['23:00', 1],
        ]),
      );
    });

    it('devuelve un mapa vacío cuando no hay sobreturnos', async () => {
      sobreturnosRepository.find.mockResolvedValue([]);

      const result = await service.obtenerCuposExtraPorHora(7, '2099-01-15');

      expect(result).toEqual(new Map());
    });
  });
});

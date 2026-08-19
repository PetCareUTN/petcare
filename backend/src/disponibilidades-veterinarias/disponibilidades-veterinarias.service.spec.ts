import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { DisponibilidadesVeterinariasService } from './disponibilidades-veterinarias.service';
import { DisponibilidadVeterinaria } from './entities/disponibilidad-veterinaria.entity';

describe('DisponibilidadesVeterinariasService', () => {
  let service: DisponibilidadesVeterinariasService;
  let disponibilidadesRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };

  const veterinario = {
    idVeterinario: 7,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  const disponibilidad = {
    diaSemana: DiaSemana.LUNES,
    horaInicio: '09:00',
    horaFin: '12:00',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisponibilidadesVeterinariasService,
        {
          provide: getRepositoryToken(DisponibilidadVeterinaria),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
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

    service = module.get<DisponibilidadesVeterinariasService>(
      DisponibilidadesVeterinariasService,
    );
    disponibilidadesRepository = module.get(
      getRepositoryToken(DisponibilidadVeterinaria),
    );
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
  });

  it('reemplaza la disponibilidad de la veterinaria validada', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    disponibilidadesRepository.create.mockImplementation(
      (entity: Partial<DisponibilidadVeterinaria>) =>
        entity as DisponibilidadVeterinaria,
    );
    disponibilidadesRepository.save.mockImplementation((entities) =>
      Promise.resolve(
        entities.map((entity: DisponibilidadVeterinaria, index: number) => ({
          ...entity,
          idDisponibilidad: index + 1,
        })),
      ),
    );

    const result = await service.replaceMine(10, {
      disponibilidades: [disponibilidad],
    });

    expect(veterinariosRepository.findOne).toHaveBeenCalledWith({
      where: { usuario: { idUsuario: 10 } },
    });
    expect(disponibilidadesRepository.delete).toHaveBeenCalledWith({
      veterinario: { idVeterinario: 7 },
    });
    expect(disponibilidadesRepository.create).toHaveBeenCalledWith({
      veterinario,
      ...disponibilidad,
    });
    expect(result).toEqual([
      {
        idDisponibilidad: 1,
        idVeterinario: 7,
        ...disponibilidad,
      },
    ]);
  });

  it('lista la disponibilidad propia ordenada por dia y horario', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    disponibilidadesRepository.find.mockResolvedValue([
      {
        idDisponibilidad: 2,
        veterinario,
        diaSemana: DiaSemana.MARTES,
        horaInicio: '10:00',
        horaFin: '12:00',
      },
      {
        idDisponibilidad: 1,
        veterinario,
        diaSemana: DiaSemana.LUNES,
        horaInicio: '09:00',
        horaFin: '11:00',
      },
    ]);

    const result = await service.findMine(10);

    expect(result.map((d) => d.diaSemana)).toEqual([
      DiaSemana.LUNES,
      DiaSemana.MARTES,
    ]);
  });

  it('rechaza una franja con hora de inicio posterior a la hora de fin', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);

    await expect(
      service.replaceMine(10, {
        disponibilidades: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '12:00', horaFin: '09:00' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(disponibilidadesRepository.delete).not.toHaveBeenCalled();
  });

  it('rechaza franjas solapadas para el mismo dia', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);

    await expect(
      service.replaceMine(10, {
        disponibilidades: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '12:00' },
          { diaSemana: DiaSemana.LUNES, horaInicio: '11:00', horaFin: '13:00' },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(disponibilidadesRepository.delete).not.toHaveBeenCalled();
  });

  it('rechaza la configuracion cuando la veterinaria no esta validada', async () => {
    veterinariosRepository.findOne.mockResolvedValue({
      idVeterinario: 7,
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    await expect(
      service.replaceMine(10, { disponibilidades: [disponibilidad] }),
    ).rejects.toThrow(ForbiddenException);
    expect(disponibilidadesRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza listar disponibilidad de una veterinaria inexistente', async () => {
    veterinariosRepository.findOne.mockResolvedValue(null);

    await expect(service.findByVeterinario(999)).rejects.toThrow(
      NotFoundException,
    );
    expect(disponibilidadesRepository.find).not.toHaveBeenCalled();
  });

  it('rechaza listar disponibilidad publica de una veterinaria no aprobada', async () => {
    veterinariosRepository.findOne.mockResolvedValue({
      idVeterinario: 7,
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    await expect(service.findByVeterinario(7)).rejects.toThrow(
      NotFoundException,
    );
    expect(disponibilidadesRepository.find).not.toHaveBeenCalled();
  });
});

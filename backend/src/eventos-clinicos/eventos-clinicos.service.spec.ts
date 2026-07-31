import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClinicalEventType } from '../common/enums/clinical-event-type.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { HistoriaClinica } from '../historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { EventoClinico } from './entities/evento-clinico.entity';
import { EventosClinicosService } from './eventos-clinicos.service';

describe('EventosClinicosService', () => {
  let service: EventosClinicosService;
  let eventosClinicosRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let historiasClinicasRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };

  const veterinario = {
    idVeterinario: 4,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  const dto: CreateEventoClinicoDto = {
    idMascota: 10,
    tipo: ClinicalEventType.DIAGNOSTICO,
    fecha: '2026-07-31',
    descripcion: 'Consulta por tos persistente',
    diagnostico: 'Bronquitis leve',
    tratamiento: 'Reposo y control',
  };

  beforeEach(async () => {
    eventosClinicosRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    historiasClinicasRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    mascotasRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    veterinariosRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventosClinicosService,
        {
          provide: getRepositoryToken(EventoClinico),
          useValue: eventosClinicosRepository,
        },
        {
          provide: getRepositoryToken(HistoriaClinica),
          useValue: historiasClinicasRepository,
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: mascotasRepository,
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: veterinariosRepository,
        },
      ],
    }).compile();

    service = module.get<EventosClinicosService>(EventosClinicosService);
  });

  it('registra un evento clinico en la historia existente de la mascota', async () => {
    const historia = { idHistoria: 20 } as HistoriaClinica;
    const mascota = {
      idMascota: 10,
      idHistoria: 20,
      historiaClinica: historia,
    } as Mascota;
    const evento = {
      idEvento: 30,
      historia,
      veterinario,
      tipo: dto.tipo,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      diagnostico: dto.diagnostico,
      tratamiento: dto.tratamiento,
      observaciones: null,
      createdAt: new Date('2026-07-31T10:00:00Z'),
      updatedAt: new Date('2026-07-31T10:00:00Z'),
    } as EventoClinico;

    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    mascotasRepository.findOne.mockResolvedValue(mascota);
    eventosClinicosRepository.create.mockReturnValue(evento);
    eventosClinicosRepository.save.mockResolvedValue(evento);

    const result = await service.create(7, dto);

    expect(veterinariosRepository.findOne).toHaveBeenCalledWith({
      where: { usuario: { idUsuario: 7 } },
    });
    expect(mascotasRepository.findOne).toHaveBeenCalledWith({
      where: { idMascota: 10 },
      relations: ['historiaClinica'],
    });
    expect(historiasClinicasRepository.save).not.toHaveBeenCalled();
    expect(eventosClinicosRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        historia,
        veterinario,
        tipo: ClinicalEventType.DIAGNOSTICO,
        descripcion: 'Consulta por tos persistente',
        observaciones: null,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        idEvento: 30,
        idHistoria: 20,
        idMascota: 10,
        idVeterinario: 4,
        tipo: ClinicalEventType.DIAGNOSTICO,
      }),
    );
  });

  it('crea la historia clinica cuando la mascota todavia no tiene una', async () => {
    const mascota = {
      idMascota: 10,
      idHistoria: null,
      historiaClinica: null,
    } as Mascota;
    const historia = { idHistoria: 21 } as HistoriaClinica;
    const evento = {
      idEvento: 31,
      historia,
      veterinario,
      tipo: dto.tipo,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      diagnostico: null,
      tratamiento: null,
      observaciones: null,
      createdAt: new Date('2026-07-31T10:00:00Z'),
      updatedAt: new Date('2026-07-31T10:00:00Z'),
    } as EventoClinico;

    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    mascotasRepository.findOne.mockResolvedValue(mascota);
    historiasClinicasRepository.create.mockReturnValue(historia);
    historiasClinicasRepository.save.mockResolvedValue(historia);
    mascotasRepository.save.mockResolvedValue({
      ...mascota,
      idHistoria: historia.idHistoria,
      historiaClinica: historia,
    });
    eventosClinicosRepository.create.mockReturnValue(evento);
    eventosClinicosRepository.save.mockResolvedValue(evento);

    const result = await service.create(7, {
      ...dto,
      diagnostico: undefined,
      tratamiento: undefined,
    });

    expect(historiasClinicasRepository.create).toHaveBeenCalledWith();
    expect(mascota.idHistoria).toBe(21);
    expect(mascotasRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idMascota: 10,
        idHistoria: 21,
        historiaClinica: historia,
      }),
    );
    expect(result.idHistoria).toBe(21);
  });

  it('rechaza el registro cuando no existe veterinario aprobado para el usuario', async () => {
    veterinariosRepository.findOne.mockResolvedValue({
      idVeterinario: 4,
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    await expect(service.create(7, dto)).rejects.toThrow(ForbiddenException);
    expect(mascotasRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza el registro cuando la mascota no existe', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    mascotasRepository.findOne.mockResolvedValue(null);

    await expect(service.create(7, dto)).rejects.toThrow(NotFoundException);
    expect(eventosClinicosRepository.save).not.toHaveBeenCalled();
  });
});

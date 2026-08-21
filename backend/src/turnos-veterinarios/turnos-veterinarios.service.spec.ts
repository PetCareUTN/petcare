import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';
import { TurnosVeterinariosService } from './turnos-veterinarios.service';

describe('TurnosVeterinariosService', () => {
  let service: TurnosVeterinariosService;
  let turnosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };

  const veterinario = {
    idVeterinario: 7,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  const duenio = {
    idUsuario: 12,
    nombre: 'Ana',
    apellido: 'Gomez',
    email: 'ana@petcare.com',
    telefono: '111111',
  } as User;

  const mascota = {
    idMascota: 21,
    nombre: 'Luna',
  } as Mascota;

  const turnoPendiente = {
    idTurno: 30,
    veterinario,
    mascota,
    duenio,
    fecha: '2026-09-01',
    hora: '10:00',
    motivoConsulta: 'Control anual',
    estado: AppointmentStatus.PENDIENTE,
    motivoRechazo: null,
  } as TurnoVeterinario;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosVeterinariosService,
        {
          provide: getRepositoryToken(TurnoVeterinario),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
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

    service = module.get<TurnosVeterinariosService>(
      TurnosVeterinariosService,
    );
    turnosRepository = module.get(getRepositoryToken(TurnoVeterinario));
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
  });

  it('lista turnos de la veterinaria validada filtrando por estado', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    turnosRepository.find.mockResolvedValue([turnoPendiente]);

    const result = await service.findMine(99, AppointmentStatus.PENDIENTE);

    expect(veterinariosRepository.findOne).toHaveBeenCalledWith({
      where: { usuario: { idUsuario: 99 } },
    });
    expect(turnosRepository.find).toHaveBeenCalledWith({
      where: {
        veterinario: { idVeterinario: 7 },
        estado: AppointmentStatus.PENDIENTE,
      },
      relations: ['veterinario', 'mascota', 'duenio'],
      order: { fecha: 'ASC', hora: 'ASC', idTurno: 'ASC' },
    });
    expect(result).toEqual([
      {
        idTurno: 30,
        idVeterinario: 7,
        idMascota: 21,
        nombreMascota: 'Luna',
        idDuenio: 12,
        nombreDuenio: 'Ana Gomez',
        emailDuenio: 'ana@petcare.com',
        telefonoDuenio: '111111',
        fecha: '2026-09-01',
        hora: '10:00',
        motivoConsulta: 'Control anual',
        estado: AppointmentStatus.PENDIENTE,
        motivoRechazo: null,
      },
    ]);
  });

  it('confirma un turno pendiente propio', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    turnosRepository.findOne.mockResolvedValue({ ...turnoPendiente });
    turnosRepository.save.mockImplementation((turno: TurnoVeterinario) =>
      Promise.resolve(turno),
    );

    const result = await service.confirmar(99, 30);

    expect(turnosRepository.save).toHaveBeenCalledWith({
      ...turnoPendiente,
      estado: AppointmentStatus.CONFIRMADO,
      motivoRechazo: null,
    });
    expect(result.estado).toBe(AppointmentStatus.CONFIRMADO);
  });

  it('rechaza un turno pendiente propio con motivo', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    turnosRepository.findOne.mockResolvedValue({ ...turnoPendiente });
    turnosRepository.save.mockImplementation((turno: TurnoVeterinario) =>
      Promise.resolve(turno),
    );

    const result = await service.rechazar(99, 30, {
      motivoRechazo: '  Sin disponibilidad de box  ',
    });

    expect(result.estado).toBe(AppointmentStatus.RECHAZADO);
    expect(result.motivoRechazo).toBe('Sin disponibilidad de box');
  });

  it('rechaza gestionar un turno ajeno a la veterinaria', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    turnosRepository.findOne.mockResolvedValue({
      ...turnoPendiente,
      veterinario: { idVeterinario: 99 },
    });

    await expect(service.confirmar(99, 30)).rejects.toThrow(
      ForbiddenException,
    );
    expect(turnosRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza gestionar un turno que no esta pendiente', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    turnosRepository.findOne.mockResolvedValue({
      ...turnoPendiente,
      estado: AppointmentStatus.CONFIRMADO,
    });

    await expect(service.rechazar(99, 30, { motivoRechazo: 'No' })).rejects.toThrow(
      BadRequestException,
    );
    expect(turnosRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza una veterinaria no validada', async () => {
    veterinariosRepository.findOne.mockResolvedValue({
      idVeterinario: 7,
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    await expect(service.findMine(99)).rejects.toThrow(ForbiddenException);
    expect(turnosRepository.find).not.toHaveBeenCalled();
  });

  it('rechaza un turno inexistente', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    turnosRepository.findOne.mockResolvedValue(null);

    await expect(service.confirmar(99, 999)).rejects.toThrow(
      NotFoundException,
    );
  });
});

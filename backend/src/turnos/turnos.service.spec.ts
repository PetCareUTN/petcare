import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { TurnoEstado } from '../common/enums/turno-estado.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { Turno } from './entities/turno.entity';
import { TurnosService } from './turnos.service';

describe('TurnosService', () => {
  let service: TurnosService;
  let turnosRepository: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };
  let disponibilidadesRepository: {
    find: jest.Mock;
  };

  const idDueno = 10;

  const mascota = {
    idMascota: 5,
    nombre: 'Firulais',
    usuarios: [{ idUsuario: idDueno }],
  } as Mascota;

  const veterinario = {
    idVeterinario: 7,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  // 2026-08-24 es lunes.
  const dto: CreateTurnoDto = {
    idMascota: 5,
    idVeterinario: 7,
    fecha: '2026-08-24',
    horaInicio: '10:00',
    horaFin: '10:30',
  };

  const disponibilidadLunes = {
    diaSemana: DiaSemana.LUNES,
    horaInicio: '09:00',
    horaFin: '12:00',
  } as DisponibilidadVeterinaria;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosService,
        {
          provide: getRepositoryToken(Turno),
          useValue: { find: jest.fn(), create: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(DisponibilidadVeterinaria),
          useValue: { find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TurnosService>(TurnosService);
    turnosRepository = module.get(getRepositoryToken(Turno));
    mascotasRepository = module.get(getRepositoryToken(Mascota));
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
    disponibilidadesRepository = module.get(
      getRepositoryToken(DisponibilidadVeterinaria),
    );
  });

  it('crea un turno pendiente cuando el horario esta disponible', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascota);
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    disponibilidadesRepository.find.mockResolvedValue([disponibilidadLunes]);
    turnosRepository.find.mockResolvedValue([]);
    const turnoCreado = { ...dto, estado: TurnoEstado.PENDIENTE } as unknown as Turno;
    turnosRepository.create.mockReturnValue(turnoCreado);
    turnosRepository.save.mockResolvedValue({
      ...turnoCreado,
      idTurno: 1,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
    });

    const result = await service.solicitar(idDueno, dto);

    expect(mascotasRepository.findOne).toHaveBeenCalledWith({
      where: { idMascota: dto.idMascota },
      relations: ['usuarios'],
    });
    expect(disponibilidadesRepository.find).toHaveBeenCalledWith({
      where: { veterinario: { idVeterinario: 7 }, diaSemana: DiaSemana.LUNES },
    });
    expect(turnosRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        veterinario,
        mascota,
        dueno: { idUsuario: idDueno },
        fecha: dto.fecha,
        horaInicio: dto.horaInicio,
        horaFin: dto.horaFin,
        estado: TurnoEstado.PENDIENTE,
      }),
    );
    expect(result.idTurno).toBe(1);
    expect(result.estado).toBe(TurnoEstado.PENDIENTE);
    expect(result.idMascota).toBe(mascota.idMascota);
  });

  it('rechaza cuando la hora de inicio es posterior o igual a la de fin', async () => {
    await expect(
      service.solicitar(idDueno, { ...dto, horaInicio: '11:00', horaFin: '10:00' }),
    ).rejects.toThrow(BadRequestException);
    expect(mascotasRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza cuando la mascota no existe', async () => {
    mascotasRepository.findOne.mockResolvedValue(null);

    await expect(service.solicitar(idDueno, dto)).rejects.toThrow(NotFoundException);
  });

  it('rechaza cuando la mascota no pertenece al dueño autenticado', async () => {
    mascotasRepository.findOne.mockResolvedValue({
      ...mascota,
      usuarios: [{ idUsuario: 999 }],
    });

    await expect(service.solicitar(idDueno, dto)).rejects.toThrow(ForbiddenException);
  });

  it('rechaza cuando la veterinaria no existe o no esta aprobada', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascota);
    veterinariosRepository.findOne.mockResolvedValue({
      idVeterinario: 7,
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    await expect(service.solicitar(idDueno, dto)).rejects.toThrow(NotFoundException);
  });

  it('rechaza un horario fuera de la disponibilidad configurada', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascota);
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    disponibilidadesRepository.find.mockResolvedValue([disponibilidadLunes]);

    await expect(
      service.solicitar(idDueno, { ...dto, horaInicio: '13:00', horaFin: '13:30' }),
    ).rejects.toThrow(BadRequestException);
    expect(turnosRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza un horario ya ocupado por otro turno', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascota);
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    disponibilidadesRepository.find.mockResolvedValue([disponibilidadLunes]);
    turnosRepository.find.mockResolvedValue([
      { horaInicio: '10:15', horaFin: '10:45', estado: TurnoEstado.PENDIENTE },
    ]);

    await expect(service.solicitar(idDueno, dto)).rejects.toThrow(BadRequestException);
    expect(turnosRepository.save).not.toHaveBeenCalled();
  });
});

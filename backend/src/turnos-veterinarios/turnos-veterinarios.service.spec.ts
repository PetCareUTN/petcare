import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateTurnoVeterinarioDto } from './dto/create-turno-veterinario.dto';
import { TurnoVeterinario } from './entities/turno-veterinario.entity';
import { TurnosVeterinariosService } from './turnos-veterinarios.service';

describe('TurnosVeterinariosService', () => {
  let service: TurnosVeterinariosService;
  let turnosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };
  let disponibilidadesRepository: {
    find: jest.Mock;
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
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DisponibilidadVeterinaria),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TurnosVeterinariosService>(
      TurnosVeterinariosService,
    );
    turnosRepository = module.get(getRepositoryToken(TurnoVeterinario));
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));
    mascotasRepository = module.get(getRepositoryToken(Mascota));
    disponibilidadesRepository = module.get(
      getRepositoryToken(DisponibilidadVeterinaria),
    );
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

  describe('solicitar', () => {
    const idDueno = 12;

    const mascotaPropia = {
      idMascota: 21,
      nombre: 'Luna',
      usuarios: [{ idUsuario: idDueno }],
    } as Mascota;

    // 2026-09-07 es lunes.
    const dto: CreateTurnoVeterinarioDto = {
      idMascota: 21,
      idVeterinario: 7,
      fecha: '2026-09-07',
      hora: '10:00',
    };

    const disponibilidadLunes = {
      diaSemana: DiaSemana.LUNES,
      horaInicio: '09:00',
      horaFin: '12:00',
    } as DisponibilidadVeterinaria;

    it('crea un turno pendiente cuando el horario esta disponible', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      disponibilidadesRepository.find.mockResolvedValue([disponibilidadLunes]);
      turnosRepository.find.mockResolvedValue([]);
      const turnoCreado = { ...dto, estado: AppointmentStatus.PENDIENTE };
      turnosRepository.create.mockReturnValue(turnoCreado);
      turnosRepository.save.mockResolvedValue({ ...turnoCreado, idTurno: 30 });
      turnosRepository.findOne.mockResolvedValue({ ...turnoPendiente, idTurno: 30 });

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
          mascota: mascotaPropia,
          fecha: dto.fecha,
          hora: dto.hora,
          estado: AppointmentStatus.PENDIENTE,
        }),
      );
      expect(result.idTurno).toBe(30);
    });

    it('rechaza cuando la mascota no existe', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza cuando la mascota no pertenece al dueño autenticado', async () => {
      mascotasRepository.findOne.mockResolvedValue({
        ...mascotaPropia,
        usuarios: [{ idUsuario: 999 }],
      });

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza cuando la veterinaria no existe o no esta aprobada', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      veterinariosRepository.findOne.mockResolvedValue({
        idVeterinario: 7,
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza un horario fuera de la disponibilidad configurada', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      disponibilidadesRepository.find.mockResolvedValue([disponibilidadLunes]);

      await expect(
        service.solicitar(idDueno, { ...dto, hora: '13:00' }),
      ).rejects.toThrow(BadRequestException);
      expect(turnosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un horario ya ocupado por otro turno', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      disponibilidadesRepository.find.mockResolvedValue([disponibilidadLunes]);
      turnosRepository.find.mockResolvedValue([
        { hora: '10:15', estado: AppointmentStatus.PENDIENTE },
      ]);

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(turnosRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findMisTurnos', () => {
    const veterinarioConUsuario = {
      idVeterinario: 7,
      estadoValidacion: ValidationStatus.APROBADO,
      usuario: {
        idUsuario: 3,
        nombre: 'Veterinaria Central',
        direccion: 'Av. Siempre Viva 742',
      },
    } as Veterinario;

    const turnoDelDuenio = {
      ...turnoPendiente,
      veterinario: veterinarioConUsuario,
    } as TurnoVeterinario;

    it('lista los turnos del dueño autenticado con la veterinaria como contraparte', async () => {
      turnosRepository.find.mockResolvedValue([turnoDelDuenio]);

      const result = await service.findMisTurnos(duenio.idUsuario);

      expect(turnosRepository.find).toHaveBeenCalledWith({
        where: { duenio: { idUsuario: duenio.idUsuario } },
        relations: ['veterinario', 'veterinario.usuario', 'mascota', 'duenio'],
        order: { fecha: 'ASC', hora: 'ASC', idTurno: 'ASC' },
      });
      expect(result).toEqual([
        {
          idTurno: 30,
          idMascota: 21,
          nombreMascota: 'Luna',
          idVeterinario: 7,
          nombreVeterinaria: 'Veterinaria Central',
          direccionVeterinaria: 'Av. Siempre Viva 742',
          fecha: '2026-09-01',
          hora: '10:00',
          motivoConsulta: 'Control anual',
          estado: AppointmentStatus.PENDIENTE,
          motivoRechazo: null,
        },
      ]);
    });

    it('filtra los turnos del dueño por estado cuando se indica', async () => {
      turnosRepository.find.mockResolvedValue([]);

      await service.findMisTurnos(
        duenio.idUsuario,
        AppointmentStatus.CONFIRMADO,
      );

      expect(turnosRepository.find).toHaveBeenCalledWith({
        where: {
          duenio: { idUsuario: duenio.idUsuario },
          estado: AppointmentStatus.CONFIRMADO,
        },
        relations: ['veterinario', 'veterinario.usuario', 'mascota', 'duenio'],
        order: { fecha: 'ASC', hora: 'ASC', idTurno: 'ASC' },
      });
    });

    it('devuelve una lista vacia cuando el dueño no tiene turnos', async () => {
      turnosRepository.find.mockResolvedValue([]);

      const result = await service.findMisTurnos(duenio.idUsuario);

      expect(result).toEqual([]);
    });
  });
});

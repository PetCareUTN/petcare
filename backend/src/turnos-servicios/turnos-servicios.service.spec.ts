import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { TurnoServicioEstado } from '../common/enums/turno-servicio-estado.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Servicio } from '../servicios/entities/servicio.entity';
import { User } from '../users/entities/user.entity';
import { CreateTurnoServicioDto } from './dto/create-turno-servicio.dto';
import { TurnoServicio } from './entities/turno-servicio.entity';
import { TurnosServiciosService } from './turnos-servicios.service';

describe('TurnosServiciosService', () => {
  let service: TurnosServiciosService;
  let turnosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let serviciosRepository: {
    findOne: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };

  const prestador = {
    idUsuario: 5,
    nombre: 'Carla',
    apellido: 'Diaz',
    email: 'carla@petcare.com',
    telefono: '222222',
  } as User;

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

  const servicio = {
    idServicio: 8,
    usuario: prestador,
    categoria: CategoriaServicio.PASEADOR,
    disponibilidades: [
      { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '12:00' },
    ],
  } as Servicio;

  const turnoConfirmado = {
    idTurno: 30,
    servicio,
    mascota,
    duenio,
    fecha: '2026-09-01',
    horaInicio: '10:00',
    horaFin: '10:30',
    notas: null,
    estado: TurnoServicioEstado.CONFIRMADO,
    canceladoPor: null,
    motivoCancelacion: null,
  } as TurnoServicio;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnosServiciosService,
        {
          provide: getRepositoryToken(TurnoServicio),
          useValue: { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() },
        },
        {
          provide: getRepositoryToken(Servicio),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TurnosServiciosService>(TurnosServiciosService);
    turnosRepository = module.get(getRepositoryToken(TurnoServicio));
    serviciosRepository = module.get(getRepositoryToken(Servicio));
    mascotasRepository = module.get(getRepositoryToken(Mascota));
  });

  describe('solicitar', () => {
    const idDueno = 12;

    const mascotaPropia = {
      idMascota: 21,
      nombre: 'Luna',
      usuarios: [{ idUsuario: idDueno }],
    } as Mascota;

    // 2026-09-07 es lunes.
    const dto: CreateTurnoServicioDto = {
      idMascota: 21,
      idServicio: 8,
      fecha: '2026-09-07',
      horaInicio: '10:00',
    };

    it('crea un turno confirmado (sin paso pendiente) cuando el horario esta disponible', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      serviciosRepository.findOne.mockResolvedValue(servicio);
      turnosRepository.find.mockResolvedValue([]);
      const turnoCreado = { ...dto, estado: TurnoServicioEstado.CONFIRMADO };
      turnosRepository.create.mockReturnValue(turnoCreado);
      turnosRepository.save.mockResolvedValue({ ...turnoCreado, idTurno: 30 });
      turnosRepository.findOne.mockResolvedValue({ ...turnoConfirmado, idTurno: 30 });

      const result = await service.solicitar(idDueno, dto);

      expect(turnosRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          servicio,
          mascota: mascotaPropia,
          fecha: dto.fecha,
          horaInicio: '10:00',
          horaFin: '10:30',
          estado: TurnoServicioEstado.CONFIRMADO,
        }),
      );
      expect(result.idTurno).toBe(30);
    });

    it('usa una duracion de 60 minutos para guarderia', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      serviciosRepository.findOne.mockResolvedValue({
        ...servicio,
        categoria: CategoriaServicio.GUARDERIA,
        disponibilidades: [
          { diaSemana: DiaSemana.LUNES, horaInicio: '09:00', horaFin: '12:00' },
        ],
      });
      turnosRepository.find.mockResolvedValue([]);
      turnosRepository.create.mockImplementation((entity) => entity);
      turnosRepository.save.mockResolvedValue({ ...turnoConfirmado, idTurno: 31 });
      turnosRepository.findOne.mockResolvedValue({ ...turnoConfirmado, idTurno: 31 });

      await service.solicitar(idDueno, dto);

      expect(turnosRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ horaInicio: '10:00', horaFin: '11:00' }),
      );
    });

    it('rechaza cuando la mascota no existe', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(NotFoundException);
    });

    it('rechaza cuando la mascota no pertenece al dueño autenticado', async () => {
      mascotasRepository.findOne.mockResolvedValue({
        ...mascotaPropia,
        usuarios: [{ idUsuario: 999 }],
      });

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(ForbiddenException);
    });

    it('rechaza cuando el servicio no existe', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      serviciosRepository.findOne.mockResolvedValue(null);

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(NotFoundException);
    });

    it('rechaza un horario fuera de la disponibilidad configurada', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      serviciosRepository.findOne.mockResolvedValue(servicio);

      await expect(
        service.solicitar(idDueno, { ...dto, horaInicio: '13:00' }),
      ).rejects.toThrow(BadRequestException);
      expect(turnosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza un horario que se superpone con otro turno confirmado del mismo prestador', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      serviciosRepository.findOne.mockResolvedValue(servicio);
      turnosRepository.find.mockResolvedValue([
        { horaInicio: '10:15', horaFin: '10:45' },
      ]);

      await expect(service.solicitar(idDueno, dto)).rejects.toThrow(BadRequestException);
      expect(turnosRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('permite cancelar al dueño', async () => {
      turnosRepository.findOne.mockResolvedValue({ ...turnoConfirmado });
      turnosRepository.save.mockImplementation((turno) => Promise.resolve(turno));

      const result = await service.cancelar(duenio.idUsuario, 30, {});

      expect(result.estado).toBe(TurnoServicioEstado.CANCELADO);
      expect((result as any).idPrestador).toBe(prestador.idUsuario);
    });

    it('permite cancelar al prestador con motivo', async () => {
      turnosRepository.findOne.mockResolvedValue({ ...turnoConfirmado });
      turnosRepository.save.mockImplementation((turno) => Promise.resolve(turno));

      const result = await service.cancelar(prestador.idUsuario, 30, {
        motivoCancelacion: '  No voy a poder atenderlo  ',
      });

      expect(result.estado).toBe(TurnoServicioEstado.CANCELADO);
      expect((result as any).motivoCancelacion).toBe('No voy a poder atenderlo');
      expect((result as any).canceladoPor).toBe('prestador');
    });

    it('rechaza cancelar a un tercero ajeno al turno', async () => {
      turnosRepository.findOne.mockResolvedValue({ ...turnoConfirmado });

      await expect(service.cancelar(999, 30, {})).rejects.toThrow(ForbiddenException);
      expect(turnosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza cancelar un turno que ya esta cancelado', async () => {
      turnosRepository.findOne.mockResolvedValue({
        ...turnoConfirmado,
        estado: TurnoServicioEstado.CANCELADO,
      });

      await expect(service.cancelar(duenio.idUsuario, 30, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(turnosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza cancelar un turno inexistente', async () => {
      turnosRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelar(duenio.idUsuario, 999, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMisReservas / findRecibidas', () => {
    it('lista las reservas del dueño autenticado', async () => {
      turnosRepository.find.mockResolvedValue([turnoConfirmado]);

      const result = await service.findMisReservas(duenio.idUsuario);

      expect(turnosRepository.find).toHaveBeenCalledWith({
        where: { duenio: { idUsuario: duenio.idUsuario } },
        relations: ['servicio', 'servicio.usuario', 'mascota', 'duenio'],
        order: { fecha: 'ASC', horaInicio: 'ASC', idTurno: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });

    it('lista las reservas recibidas por el prestador autenticado', async () => {
      turnosRepository.find.mockResolvedValue([turnoConfirmado]);

      const result = await service.findRecibidas(prestador.idUsuario);

      expect(turnosRepository.find).toHaveBeenCalledWith({
        where: { servicio: { usuario: { idUsuario: prestador.idUsuario } } },
        relations: ['servicio', 'servicio.usuario', 'mascota', 'duenio'],
        order: { fecha: 'ASC', horaInicio: 'ASC', idTurno: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('horariosDisponibles', () => {
    it('devuelve los horarios libres excluyendo los ya confirmados', async () => {
      serviciosRepository.findOne.mockResolvedValue(servicio);
      // Postgres devuelve las columnas TIME con segundos (ej. "09:30:00").
      turnosRepository.find.mockResolvedValue([
        { horaInicio: '09:30:00', estado: TurnoServicioEstado.CONFIRMADO },
      ]);

      // 2026-09-07 es lunes; el servicio dura 30 min (paseador).
      const result = await service.horariosDisponibles(8, '2026-09-07');

      expect(serviciosRepository.findOne).toHaveBeenCalledWith({
        where: { idServicio: 8 },
        relations: ['usuario', 'disponibilidades'],
      });
      expect(result).toEqual(['09:00', '10:00', '10:30', '11:00', '11:30']);
    });

    it('rechaza cuando el servicio no existe', async () => {
      serviciosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.horariosDisponibles(999, '2026-09-07'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

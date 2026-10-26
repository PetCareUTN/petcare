import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion } from './entities/notificacion.entity';
import { NotificationType } from '../common/enums/notification-type.enum';
import { DispositivosPushService } from './dispositivos-push.service';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let repository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let dispositivosPushService: { enviarNotificacion: jest.Mock };

  beforeEach(async () => {
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        { provide: getRepositoryToken(Notificacion), useValue: repository },
        {
          provide: DispositivosPushService,
          useValue: { enviarNotificacion: jest.fn().mockResolvedValue(1) },
        },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
    dispositivosPushService = module.get(DispositivosPushService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('crear', () => {
    it('debería crear una notificación con leida en false', async () => {
      const notificacion = {
        idNotificacion: 1,
        tipo: NotificationType.SOLICITUD_RECIBIDA,
        titulo: 'Solicitud recibida',
        cuerpo: 'Tu solicitud fue recibida.',
        leida: false,
        fechaEnvio: new Date(),
      };
      repository.create.mockReturnValue(notificacion);
      repository.save.mockResolvedValue(notificacion);

      const result = await service.crear(
        1,
        NotificationType.SOLICITUD_RECIBIDA,
        'Solicitud recibida',
        'Tu solicitud fue recibida.',
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: NotificationType.SOLICITUD_RECIBIDA,
          titulo: 'Solicitud recibida',
          leida: false,
        }),
      );
      expect(repository.save).toHaveBeenCalled();
      expect(result.idNotificacion).toBe(1);
      expect(result.leida).toBe(false);
    });
  });

  describe('listarPorUsuario', () => {
    it('debería listar notificaciones de un usuario ordenadas por fecha', async () => {
      const notificaciones = [
        {
          idNotificacion: 2,
          titulo: 'Segunda',
          fechaEnvio: new Date('2026-07-23'),
        },
        {
          idNotificacion: 1,
          titulo: 'Primera',
          fechaEnvio: new Date('2026-07-22'),
        },
      ];
      repository.find.mockResolvedValue(notificaciones);

      const result = await service.listarPorUsuario(1);

      expect(repository.find).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: 1 } },
        order: { fechaEnvio: 'DESC' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].titulo).toBe('Segunda');
    });
  });

  describe('marcarLeida', () => {
    it('debería marcar una notificación como leída', async () => {
      const notificacion = { idNotificacion: 1, leida: false };
      repository.findOne.mockResolvedValue(notificacion);
      repository.save.mockResolvedValue({ ...notificacion, leida: true });

      const result = await service.marcarLeida(1, 1);

      expect(notificacion.leida).toBe(true);
      expect(repository.save).toHaveBeenCalled();
      expect(result.mensaje).toBe('Notificación marcada como leída');
    });

    it('debería lanzar NotFoundException si no existe la notificación', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.marcarLeida(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('marcarTodasLeidas', () => {
    it('debería marcar solo las no leídas del usuario autenticado', async () => {
      repository.update.mockResolvedValue({ affected: 3 });

      const result = await service.marcarTodasLeidas(7);

      expect(repository.update).toHaveBeenCalledWith(
        { usuario: { idUsuario: 7 }, leida: false },
        { leida: true },
      );
      expect(result.cantidad).toBe(3);
    });

    it('debería devolver cantidad 0 cuando no había ninguna sin leer', async () => {
      repository.update.mockResolvedValue({ affected: 0 });

      const result = await service.marcarTodasLeidas(7);

      expect(result.cantidad).toBe(0);
    });
  });

  describe('push (canal adicional)', () => {
    const notificacionGuardada = {
      idNotificacion: 9,
      tipo: NotificationType.TURNO_CONFIRMADO,
      titulo: 'Turno confirmado',
      cuerpo: 'Mañana a las 10:00',
      leida: false,
      fechaEnvio: new Date('2026-10-25T12:00:00.000Z'),
      idReferencia: 33,
      tipoReferencia: 'turno_veterinario',
    };

    beforeEach(() => {
      repository.create.mockReturnValue(notificacionGuardada);
      repository.save.mockResolvedValue(notificacionGuardada);
    });

    it('manda la notificación al dispositivo del destinatario', async () => {
      await service.crear(
        7,
        NotificationType.TURNO_CONFIRMADO,
        'Turno confirmado',
        'Mañana a las 10:00',
        33,
        'turno_veterinario',
      );

      expect(dispositivosPushService.enviarNotificacion).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          idNotificacion: 9,
          titulo: 'Turno confirmado',
          idReferencia: 33,
          tipoReferencia: 'turno_veterinario',
        }),
      );
    });

    it('guarda la notificación interna aunque el push falle', async () => {
      dispositivosPushService.enviarNotificacion.mockRejectedValue(
        new Error('FCM caído'),
      );

      // El push es un canal extra: si se cae, el aviso tiene que quedar igual
      // en el historial, que es lo que garantiza que no se pierda.
      await expect(
        service.crear(
          7,
          NotificationType.TURNO_CONFIRMADO,
          'Turno confirmado',
          'Mañana a las 10:00',
        ),
      ).resolves.toEqual(expect.objectContaining({ idNotificacion: 9 }));

      expect(repository.save).toHaveBeenCalled();
    });
  });
});

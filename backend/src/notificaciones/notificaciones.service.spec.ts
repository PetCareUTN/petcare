import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { Notificacion } from './entities/notificacion.entity';
import { NotificationType } from '../common/enums/notification-type.enum';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let repository: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

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
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
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
        { idNotificacion: 2, titulo: 'Segunda', fechaEnvio: new Date('2026-07-23') },
        { idNotificacion: 1, titulo: 'Primera', fechaEnvio: new Date('2026-07-22') },
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

      await expect(service.marcarLeida(999, 1)).rejects.toThrow(NotFoundException);
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
});

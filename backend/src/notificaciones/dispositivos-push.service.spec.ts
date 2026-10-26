import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { DispositivosPushService } from './dispositivos-push.service';
import { NotificacionResponseDto } from './dto/notificacion-response.dto';
import { DispositivoPush } from './entities/dispositivo-push.entity';
import { PushService } from './push.service';

describe('DispositivosPushService', () => {
  let service: DispositivosPushService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let pushService: { enviar: jest.Mock; habilitado: boolean };

  const ID_USUARIO = 7;
  const TOKEN = 'token-del-celular';

  const notificacion = (): NotificacionResponseDto => ({
    idNotificacion: 9,
    tipo: NotificationType.MASCOTA_DETECTADA,
    titulo: 'Detectaron a Firulais cerca',
    cuerpo: 'La red colaborativa la detectó a las 10:30.',
    leida: false,
    fechaEnvio: new Date('2026-10-25T13:30:00.000Z'),
    idReferencia: 4,
    tipoReferencia: null,
  });

  beforeEach(async () => {
    repository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((x: unknown) => x),
      save: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    };
    pushService = { enviar: jest.fn(), habilitado: true };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispositivosPushService,
        { provide: getRepositoryToken(DispositivoPush), useValue: repository },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(DispositivosPushService);
  });

  describe('registrar', () => {
    it('guarda el token del dispositivo de la sesión', async () => {
      await service.registrar(ID_USUARIO, TOKEN);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          token: TOKEN,
          usuario: { idUsuario: ID_USUARIO },
        }),
      );
    });

    it('reasigna el token cuando otra cuenta inicia sesión en el mismo teléfono', async () => {
      repository.findOne.mockResolvedValue({
        idDispositivo: 1,
        token: TOKEN,
        usuario: { idUsuario: 99 },
        plataforma: 'android',
      });

      await service.registrar(ID_USUARIO, TOKEN);

      // No se duplica: el mismo aparato pasa al usuario que lo está usando.
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          idDispositivo: 1,
          usuario: { idUsuario: ID_USUARIO },
        }),
      );
    });
  });

  describe('eliminar', () => {
    it('da de baja solo un dispositivo propio', async () => {
      await service.eliminar(ID_USUARIO, TOKEN);

      // El id de usuario va en el where para que una sesión no pueda dar de
      // baja el dispositivo de otra persona conociendo su token.
      expect(repository.delete).toHaveBeenCalledWith({
        token: TOKEN,
        usuario: { idUsuario: ID_USUARIO },
      });
    });
  });

  describe('enviarNotificacion', () => {
    it('manda el aviso a cada dispositivo del destinatario', async () => {
      repository.find.mockResolvedValue([
        { idDispositivo: 1, token: 'token-a' },
        { idDispositivo: 2, token: 'token-b' },
      ]);
      pushService.enviar.mockResolvedValue({ entregado: true });

      await expect(
        service.enviarNotificacion(ID_USUARIO, notificacion()),
      ).resolves.toBe(2);

      expect(repository.find).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: ID_USUARIO } },
      });
    });

    it('incluye los datos que la app necesita para abrir la pantalla', async () => {
      repository.find.mockResolvedValue([{ idDispositivo: 1, token: TOKEN }]);
      pushService.enviar.mockResolvedValue({ entregado: true });

      await service.enviarNotificacion(ID_USUARIO, notificacion());

      const [mensaje] = pushService.enviar.mock.calls[0] as [
        { datos: Record<string, string> },
      ];
      expect(mensaje.datos).toEqual({
        idNotificacion: '9',
        tipo: NotificationType.MASCOTA_DETECTADA,
        idReferencia: '4',
      });
    });

    it('borra el token que FCM ya no reconoce', async () => {
      repository.find.mockResolvedValue([{ idDispositivo: 5, token: TOKEN }]);
      pushService.enviar.mockResolvedValue({
        entregado: false,
        tokenInvalido: true,
      });

      await service.enviarNotificacion(ID_USUARIO, notificacion());

      // Si no se borra, se reintenta para siempre contra un destino que ya no
      // existe (app desinstalada o token rotado).
      expect(repository.delete).toHaveBeenCalledWith({ idDispositivo: 5 });
    });

    it('conserva el token cuando el fallo es pasajero', async () => {
      repository.find.mockResolvedValue([{ idDispositivo: 5, token: TOKEN }]);
      pushService.enviar.mockResolvedValue({
        entregado: false,
        tokenInvalido: false,
      });

      await service.enviarNotificacion(ID_USUARIO, notificacion());

      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('no hace nada si el push no está configurado', async () => {
      pushService.habilitado = false;

      await expect(
        service.enviarNotificacion(ID_USUARIO, notificacion()),
      ).resolves.toBe(0);

      expect(repository.find).not.toHaveBeenCalled();
    });

    it('no propaga el error si falla la consulta de dispositivos', async () => {
      repository.find.mockRejectedValue(new Error('base caída'));

      await expect(
        service.enviarNotificacion(ID_USUARIO, notificacion()),
      ).resolves.toBe(0);
    });
  });
});

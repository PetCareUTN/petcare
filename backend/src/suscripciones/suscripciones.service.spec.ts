import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhookSignatureValidator } from 'mercadopago';
import { NotificationType } from '../common/enums/notification-type.enum';
import { SuscripcionEstado } from '../common/enums/suscripcion-estado.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { User } from '../users/entities/user.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { PagoSuscripcion } from './entities/pago-suscripcion.entity';
import { Suscripcion } from './entities/suscripcion.entity';
import { SuscripcionesService } from './suscripciones.service';

const preApprovalCreate = jest.fn();
const preApprovalGet = jest.fn();
const paymentGet = jest.fn();

jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  PreApproval: jest.fn().mockImplementation(() => ({
    create: preApprovalCreate,
    get: preApprovalGet,
  })),
  Payment: jest.fn().mockImplementation(() => ({ get: paymentGet })),
  WebhookSignatureValidator: { validate: jest.fn() },
}));

describe('SuscripcionesService', () => {
  let service: SuscripcionesService;
  let suscripcionesRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let pagosRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };
  let notificacionesService: {
    crear: jest.Mock;
  };

  const ID_VETERINARIO = 1;
  const usuario = {
    idUsuario: ID_VETERINARIO,
    email: 'vet@example.com',
  } as User;
  const veterinarioAprobado = {
    idVeterinario: 10,
    estadoValidacion: ValidationStatus.APROBADO,
    usuario,
  } as Veterinario;

  let suscripcionPendiente: Suscripcion;

  const construirService = async (): Promise<SuscripcionesService> => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuscripcionesService,
        {
          provide: getRepositoryToken(Suscripcion),
          useValue: suscripcionesRepository,
        },
        {
          provide: getRepositoryToken(PagoSuscripcion),
          useValue: pagosRepository,
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: veterinariosRepository,
        },
        { provide: NotificacionesService, useValue: notificacionesService },
      ],
    }).compile();

    return module.get<SuscripcionesService>(SuscripcionesService);
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    suscripcionPendiente = {
      idSuscripcion: 5,
      usuario,
      estado: SuscripcionEstado.PENDIENTE_PAGO,
      monto: 1000,
      moneda: 'ARS',
      mpPreapprovalId: null,
      fechaInicio: null,
      fechaFin: null,
      fechaGraciaInicio: null,
      fechaVencimiento: null,
      graciaNotificada: false,
    } as Suscripcion;

    suscripcionesRepository = {
      create: jest.fn(),
      save: jest.fn((s: Suscripcion) => Promise.resolve(s)),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    pagosRepository = {
      create: jest.fn((p: PagoSuscripcion) => p),
      save: jest.fn((p: PagoSuscripcion) => Promise.resolve(p)),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    veterinariosRepository = {
      findOne: jest.fn(),
    };
    notificacionesService = {
      crear: jest.fn().mockResolvedValue(undefined),
    };

    service = await construirService();
  });

  describe('obtenerMia', () => {
    it('devuelve la suscripción existente', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(resultado.idSuscripcion).toBe(5);
      expect(resultado.estado).toBe(SuscripcionEstado.PENDIENTE_PAGO);
      expect(suscripcionesRepository.create).not.toHaveBeenCalled();
    });

    it('crea una suscripción PENDIENTE_PAGO si no existe', async () => {
      suscripcionesRepository.findOne.mockResolvedValue(null);
      suscripcionesRepository.create.mockReturnValue({
        ...suscripcionPendiente,
      });
      suscripcionesRepository.save.mockResolvedValue({
        ...suscripcionPendiente,
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(suscripcionesRepository.create).toHaveBeenCalled();
      expect(resultado.estado).toBe(SuscripcionEstado.PENDIENTE_PAGO);
    });

    it('no consulta MP si no hay preapproval asociado', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(preApprovalGet).not.toHaveBeenCalled();
      expect(resultado.accesoPermitido).toBe(false);
      expect(resultado.codigoBloqueo).toBe('SUSCRIPCION_PENDIENTE');
    });

    it('pull-verification: activa si MP dice que el preapproval está authorized', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'authorized',
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(preApprovalGet).toHaveBeenCalledWith({ id: 'mp-pre-123' });
      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: SuscripcionEstado.ACTIVA }),
      );
      expect(resultado.estado).toBe(SuscripcionEstado.ACTIVA);
      expect(resultado.accesoPermitido).toBe(true);
    });

    it('pull-verification: no activa si MP sigue en pending', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'pending',
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(resultado.estado).toBe(SuscripcionEstado.PENDIENTE_PAGO);
      expect(resultado.accesoPermitido).toBe(false);
    });

    it('pull-verification: si falla la consulta a MP, devuelve el estado local', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });
      preApprovalGet.mockRejectedValue(new Error('mp no responde'));

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(resultado.estado).toBe(SuscripcionEstado.PENDIENTE_PAGO);
      expect(resultado.accesoPermitido).toBe(false);
    });

    it('pull-verification: cancelled de una suscripción nunca activada mantiene PENDIENTE_PAGO', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'cancelled',
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(resultado.estado).toBe(SuscripcionEstado.PENDIENTE_PAGO);
      expect(resultado.accesoPermitido).toBe(false);
    });

    it('pull-verification: cancelled de una suscripción previamente activa la pasa a CANCELADA', async () => {
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
        // Reintento tras una cancelación: estado PENDIENTE_PAGO pero la
        // fecha_inicio de la activación anterior sigue presente.
        fechaInicio: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'cancelled',
      });

      const resultado = await service.obtenerMia(ID_VETERINARIO);

      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: SuscripcionEstado.CANCELADA }),
      );
      expect(resultado.estado).toBe(SuscripcionEstado.CANCELADA);
    });
  });

  describe('suscribirme', () => {
    it('crea el preapproval y devuelve init_point', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
      });
      preApprovalCreate.mockResolvedValue({
        id: 'mp-pre-123',
        init_point:
          'https://www.mercadopago.com.ar/checkout/v1/redirect?preapproval_id=mp-pre-123',
      });

      const resultado = await service.suscribirme(ID_VETERINARIO);

      const [args] = preApprovalCreate.mock.calls as Array<
        [
          {
            body: {
              payer_email: string;
              external_reference: string;
              auto_recurring: {
                frequency: number;
                frequency_type: string;
                transaction_amount: number;
                currency_id: string;
              };
            };
          },
        ]
      >;
      const llamada = args[0];
      expect(llamada.body.payer_email).toBe('vet@example.com');
      expect(llamada.body.external_reference).toBe('5');
      expect(llamada.body.auto_recurring.frequency).toBe(1);
      expect(llamada.body.auto_recurring.frequency_type).toBe('months');
      expect(llamada.body.auto_recurring.transaction_amount).toBe(1000);
      expect(llamada.body.auto_recurring.currency_id).toBe('ARS');

      expect(resultado.initPoint).toContain('mercadopago.com.ar');
      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ mpPreapprovalId: 'mp-pre-123' }),
      );
    });

    describe('payer_email', () => {
      let respaldoPayer: string | undefined;

      beforeEach(() => {
        respaldoPayer = process.env.MP_PAYER_EMAIL;
        delete process.env.MP_PAYER_EMAIL;

        veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
        suscripcionesRepository.findOne.mockResolvedValue({
          ...suscripcionPendiente,
        });
        preApprovalCreate.mockResolvedValue({
          id: 'mp-pre-123',
          init_point:
            'https://www.mercadopago.com.ar/checkout/v1/redirect?preapproval_id=mp-pre-123',
        });
      });

      afterEach(() => {
        if (respaldoPayer === undefined) {
          delete process.env.MP_PAYER_EMAIL;
        } else {
          process.env.MP_PAYER_EMAIL = respaldoPayer;
        }
      });

      const payerEmailEnviado = (): string => {
        const [args] = preApprovalCreate.mock.calls as Array<
          [{ body: { payer_email: string } }]
        >;
        return args[0].body.payer_email;
      };

      it('usa MP_PAYER_EMAIL si está configurada (y le hace trim)', async () => {
        process.env.MP_PAYER_EMAIL = ' buyer@testuser.com ';

        await service.suscribirme(ID_VETERINARIO);

        expect(payerEmailEnviado()).toBe('buyer@testuser.com');
      });

      it('usa el email del veterinario si MP_PAYER_EMAIL no está configurada', async () => {
        await service.suscribirme(ID_VETERINARIO);

        expect(payerEmailEnviado()).toBe('vet@example.com');
      });
    });

    it('rechaza si la cuenta no está validada', async () => {
      veterinariosRepository.findOne.mockResolvedValue({
        ...veterinarioAprobado,
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      await expect(service.suscribirme(ID_VETERINARIO)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rechaza si la suscripción ya está activa', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.ACTIVA,
      });

      await expect(service.suscribirme(ID_VETERINARIO)).rejects.toThrow(
        ConflictException,
      );
    });

    it('reintenta desde CANCELADA creando un preapproval nuevo', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.CANCELADA,
        mpPreapprovalId: 'mp-pre-viejo',
        fechaInicio: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      });
      preApprovalCreate.mockResolvedValue({
        id: 'mp-pre-nuevo',
        init_point:
          'https://www.mercadopago.com.ar/checkout/v1/redirect?preapproval_id=mp-pre-nuevo',
      });

      const resultado = await service.suscribirme(ID_VETERINARIO);

      expect(preApprovalCreate).toHaveBeenCalledTimes(1);
      expect(resultado.initPoint).toContain('mp-pre-nuevo');
      expect(resultado.suscripcion.estado).toBe(
        SuscripcionEstado.PENDIENTE_PAGO,
      );
      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: SuscripcionEstado.PENDIENTE_PAGO,
          mpPreapprovalId: 'mp-pre-nuevo',
        }),
      );
    });

    describe('URLs que se le pasan a Mercado Pago', () => {
      const VARS_DE_URL = [
        'FRONTEND_PUBLIC_URL',
        'API_PUBLIC_URL',
        'CORS_ORIGIN',
        'API_URL',
      ];
      let respaldo: Record<string, string | undefined>;

      beforeEach(() => {
        respaldo = {};
        for (const variable of VARS_DE_URL) {
          respaldo[variable] = process.env[variable];
          delete process.env[variable];
        }

        veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
        suscripcionesRepository.findOne.mockResolvedValue({
          ...suscripcionPendiente,
        });
        preApprovalCreate.mockResolvedValue({
          id: 'mp-pre-123',
          init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect',
        });
      });

      afterEach(() => {
        for (const variable of VARS_DE_URL) {
          if (respaldo[variable] === undefined) {
            delete process.env[variable];
          } else {
            process.env[variable] = respaldo[variable];
          }
        }
      });

      const urlsEnviadasAmp = (): {
        back_url: string;
        notification_url: string;
      } => {
        const [args] = preApprovalCreate.mock.calls as Array<
          [
            {
              body: { back_url: string; notification_url: string };
            },
          ]
        >;
        const { back_url, notification_url } = args[0].body;
        return { back_url, notification_url };
      };

      it('usa la URL del túnel del backend para back_url y webhook (y normaliza la barra final)', async () => {
        process.env.API_PUBLIC_URL = 'https://api-tunel.example/';
        process.env.FRONTEND_PUBLIC_URL = 'https://front-tunel.example';

        await service.suscribirme(ID_VETERINARIO);

        expect(urlsEnviadasAmp()).toEqual({
          back_url: 'https://api-tunel.example/suscripciones/retorno',
          notification_url: 'https://api-tunel.example/suscripciones/webhook',
        });
      });

      it('cae en API_URL si no hay túnel (back_url igual apunta al endpoint de retorno)', async () => {
        process.env.API_URL = 'http://localhost:3000';

        await service.suscribirme(ID_VETERINARIO);

        expect(urlsEnviadasAmp()).toEqual({
          back_url: 'http://localhost:3000/suscripciones/retorno',
          notification_url: 'http://localhost:3000/suscripciones/webhook',
        });
      });

      it('usa valores locales por defecto si no hay ninguna URL configurada', async () => {
        await service.suscribirme(ID_VETERINARIO);

        expect(urlsEnviadasAmp()).toEqual({
          back_url: 'http://localhost:3000/suscripciones/retorno',
          notification_url: 'http://localhost:3000/suscripciones/webhook',
        });
      });

      it('descarta una URL inválida y usa la siguiente candidata', async () => {
        process.env.API_PUBLIC_URL = 'tunel sin protocolo';
        process.env.API_URL = 'http://localhost:3000';

        await service.suscribirme(ID_VETERINARIO);

        expect(urlsEnviadasAmp().back_url).toBe(
          'http://localhost:3000/suscripciones/retorno',
        );
      });

      it('usa la URL local por defecto si ninguna candidata es válida', async () => {
        process.env.API_PUBLIC_URL = 'tunel sin protocolo';
        process.env.API_URL = 'otra-cosa';

        await service.suscribirme(ID_VETERINARIO);

        expect(urlsEnviadasAmp()).toEqual({
          back_url: 'http://localhost:3000/suscripciones/retorno',
          notification_url: 'http://localhost:3000/suscripciones/webhook',
        });
      });

      it('urlRetornoFrontend usa FRONTEND_PUBLIC_URL si está seteada', () => {
        process.env.FRONTEND_PUBLIC_URL = 'https://front-tunel.example/';

        expect(service.urlRetornoFrontend()).toBe(
          'https://front-tunel.example/suscripciones',
        );
      });

      it('urlRetornoFrontend usa solo el primer origen de CORS_ORIGIN si es una lista', () => {
        process.env.CORS_ORIGIN =
          'http://localhost:4200, https://front-tunel.example';

        expect(service.urlRetornoFrontend()).toBe(
          'http://localhost:4200/suscripciones',
        );
      });

      it('urlRetornoFrontend cae en localhost:4200 sin ninguna URL configurada', () => {
        expect(service.urlRetornoFrontend()).toBe(
          'http://localhost:4200/suscripciones',
        );
      });
    });
  });

  describe('manejarWebhook', () => {
    const headers = { 'x-signature': 'ts=1,v1=abc', 'x-request-id': 'req-1' };

    const permitirFirma = () => {
      process.env.MP_WEBHOOK_SECRET = 'secret-test';
      (WebhookSignatureValidator.validate as jest.Mock).mockImplementation(
        () => undefined,
      );
    };

    afterEach(() => {
      delete process.env.MP_WEBHOOK_SECRET;
    });

    it('rechaza con 401 si la firma es inválida', async () => {
      process.env.MP_WEBHOOK_SECRET = 'secret-test';
      (WebhookSignatureValidator.validate as jest.Mock).mockImplementation(
        () => {
          throw new Error('bad signature');
        },
      );

      await expect(
        service.manejarWebhook(
          headers,
          { 'data.id': '123' },
          { type: 'payment' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('responde ok ante un evento sin data.id (ack)', async () => {
      permitirFirma();

      const resultado = await service.manejarWebhook(
        headers,
        {},
        { type: 'unknown' },
      );

      expect(resultado).toEqual({ ok: true });
      expect(pagosRepository.save).not.toHaveBeenCalled();
    });

    it('activa la suscripción cuando el preapproval está authorized', async () => {
      permitirFirma();
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'authorized',
      });
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });
      const resultado = await service.manejarWebhook(
        headers,
        { type: 'preapproval', 'data.id': 'mp-pre-123' },
        { type: 'preapproval', data: { id: 'mp-pre-123' } },
      );

      expect(resultado).toEqual({ ok: true });
      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: SuscripcionEstado.ACTIVA,
          fechaGraciaInicio: null,
        }),
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_VETERINARIO,
        NotificationType.SUSCRIPCION_RENOVADA,
        expect.any(String),
        expect.any(String),
      );
    });

    it('ignora pagos ya procesados (idempotencia)', async () => {
      permitirFirma();
      paymentGet.mockResolvedValue({
        id: '999',
        status: 'approved',
        external_reference: '5',
        transaction_amount: 1000,
        currency_id: 'ARS',
        date_approved: new Date().toISOString(),
      });
      pagosRepository.findOne.mockResolvedValue({ idPago: 1 });

      await service.manejarWebhook(
        headers,
        { type: 'payment', 'data.id': '999' },
        { type: 'payment', data: { id: '999' } },
      );

      expect(paymentGet).toHaveBeenCalledWith({ id: '999' });
      // El pago ya existía: no se vuelve a guardar.
      expect(pagosRepository.save).not.toHaveBeenCalled();
    });

    it('registra el pago aprobado y activa la suscripción', async () => {
      permitirFirma();
      paymentGet.mockResolvedValue({
        id: '888',
        status: 'approved',
        external_reference: '5',
        transaction_amount: 1000,
        currency_id: 'ARS',
        date_approved: new Date().toISOString(),
      });
      pagosRepository.findOne.mockResolvedValue(null);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
      });

      await service.manejarWebhook(
        headers,
        { type: 'payment', 'data.id': '888' },
        { type: 'payment', data: { id: '888' } },
      );

      expect(pagosRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          mpPaymentId: '888',
          estado: 'aprobado',
        }),
      );
      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: SuscripcionEstado.ACTIVA }),
      );
    });

    it('el primer pago rechazado queda PENDIENTE_PAGO, sin gracia ni notificación', async () => {
      permitirFirma();
      paymentGet.mockResolvedValue({
        id: '777',
        status: 'rejected',
        external_reference: '5',
        transaction_amount: 1000,
        currency_id: 'ARS',
      });
      pagosRepository.findOne.mockResolvedValue(null);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
      });

      await service.manejarWebhook(
        headers,
        { type: 'payment', 'data.id': '777' },
        { type: 'payment', data: { id: '777' } },
      );

      expect(pagosRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ mpPaymentId: '777', estado: 'rechazado' }),
      );
      // Nunca cambia de estado: ni a VENCIDA (eso daría gracia) ni a otra cosa.
      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });

    it('una renovación rechazada de una suscripción ACTIVA sí inicia la gracia', async () => {
      permitirFirma();
      paymentGet.mockResolvedValue({
        id: '776',
        status: 'rejected',
        external_reference: '5',
        transaction_amount: 1000,
        currency_id: 'ARS',
      });
      pagosRepository.findOne.mockResolvedValue(null);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.ACTIVA,
        fechaInicio: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        fechaFin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });

      await service.manejarWebhook(
        headers,
        { type: 'payment', 'data.id': '776' },
        { type: 'payment', data: { id: '776' } },
      );

      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: SuscripcionEstado.VENCIDA,
          fechaGraciaInicio: expect.any(Date) as Date,
        }),
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_VETERINARIO,
        NotificationType.SUSCRIPCION_VENCIDA,
        expect.any(String),
        expect.stringContaining('3 días de gracia'),
      );
    });

    it('un preapproval pausado sin pago aprobado no inicia gracia', async () => {
      permitirFirma();
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'paused',
      });
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });

      await service.manejarWebhook(
        headers,
        { type: 'preapproval', 'data.id': 'mp-pre-123' },
        { type: 'preapproval', data: { id: 'mp-pre-123' } },
      );

      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });

    it('cancelled de una suscripción nunca activada mantiene PENDIENTE_PAGO', async () => {
      permitirFirma();
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'cancelled',
      });
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
      });

      const resultado = await service.manejarWebhook(
        headers,
        { type: 'preapproval', 'data.id': 'mp-pre-123' },
        { type: 'preapproval', data: { id: 'mp-pre-123' } },
      );

      expect(resultado).toEqual({ ok: true });
      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });

    it('cancelled de una suscripción que ya estuvo activa la pasa a CANCELADA', async () => {
      permitirFirma();
      preApprovalGet.mockResolvedValue({
        id: 'mp-pre-123',
        status: 'cancelled',
      });
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        mpPreapprovalId: 'mp-pre-123',
        estado: SuscripcionEstado.SUSPENDIDA,
        fechaInicio: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        fechaGraciaInicio: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      });

      await service.manejarWebhook(
        headers,
        { type: 'preapproval', 'data.id': 'mp-pre-123' },
        { type: 'preapproval', data: { id: 'mp-pre-123' } },
      );

      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: SuscripcionEstado.CANCELADA,
          fechaGraciaInicio: null,
        }),
      );
    });
  });

  describe('revisarVencimientos (cron)', () => {
    it('vence una suscripción ACTIVA cuyo período terminó e inicia la gracia', async () => {
      const ayer = new Date(Date.now() - 24 * 60 * 60 * 1000);
      suscripcionesRepository.find.mockResolvedValue([
        {
          ...suscripcionPendiente,
          estado: SuscripcionEstado.ACTIVA,
          fechaFin: ayer,
          fechaInicio: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
      ]);

      await service.revisarVencimientos();

      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          estado: SuscripcionEstado.VENCIDA,
          fechaGraciaInicio: expect.any(Date) as Date,
          graciaNotificada: false,
        }),
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_VETERINARIO,
        NotificationType.SUSCRIPCION_VENCIDA,
        expect.any(String),
        expect.stringContaining('3 días de gracia'),
      );
    });

    it('no toca las suscripciones ACTIVAS vigentes', async () => {
      const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
      suscripcionesRepository.find.mockResolvedValue([
        {
          ...suscripcionPendiente,
          estado: SuscripcionEstado.ACTIVA,
          fechaFin: manana,
        },
      ]);

      await service.revisarVencimientos();

      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });

    it('suspende las VENCidas que se pasaron de la gracia y avisa una vez', async () => {
      const hace4Dias = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      suscripcionesRepository.find
        .mockResolvedValueOnce([]) // consulta de ACTIVAS
        .mockResolvedValueOnce([
          {
            ...suscripcionPendiente,
            estado: SuscripcionEstado.VENCIDA,
            fechaGraciaInicio: hace4Dias,
          },
        ]) // consulta de VENCIDAS para suspender
        .mockResolvedValueOnce([]); // consulta de VENCIDAS para avisar por gracia

      await service.revisarVencimientos();

      expect(suscripcionesRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ estado: SuscripcionEstado.SUSPENDIDA }),
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_VETERINARIO,
        NotificationType.SUSCRIPCION_SUSPENDIDA,
        expect.any(String),
        expect.any(String),
      );
    });

    it('no suspende las VENCidas que todavía están en gracia', async () => {
      const hace1Dia = new Date(Date.now() - 24 * 60 * 60 * 1000);
      suscripcionesRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            ...suscripcionPendiente,
            estado: SuscripcionEstado.VENCIDA,
            fechaGraciaInicio: hace1Dia,
          },
        ])
        .mockResolvedValueOnce([]);

      await service.revisarVencimientos();

      expect(suscripcionesRepository.save).not.toHaveBeenCalled();
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });
  });

  describe('evaluarAccesoDe', () => {
    it('permite si está ACTIVA', () => {
      expect(
        service.evaluarAccesoDe({
          ...suscripcionPendiente,
          estado: SuscripcionEstado.ACTIVA,
        }).accesoPermitido,
      ).toBe(true);
    });

    it('permite si está VENCIDA dentro de la gracia', () => {
      const hace1Dia = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(
        service.evaluarAccesoDe({
          ...suscripcionPendiente,
          estado: SuscripcionEstado.VENCIDA,
          fechaGraciaInicio: hace1Dia,
        }).accesoPermitido,
      ).toBe(true);
    });

    it('bloquea si está VENCIDA con gracia de más de 3 días', () => {
      const hace4Dias = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
      const acceso = service.evaluarAccesoDe({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.VENCIDA,
        fechaGraciaInicio: hace4Dias,
      });
      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('SUSCRIPCION_VENCIDA');
    });

    it('bloquea si está SUSPENDIDA', () => {
      const acceso = service.evaluarAccesoDe({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.SUSPENDIDA,
      });
      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('SUSCRIPCION_SUSPENDIDA');
    });

    it('bloquea si no hay suscripción', () => {
      const acceso = service.evaluarAccesoDe(null);
      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('SUSCRIPCION_PENDIENTE');
    });

    it('bloquea si está PENDIENTE_PAGO', () => {
      const acceso = service.evaluarAccesoDe(suscripcionPendiente);
      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('SUSCRIPCION_PENDIENTE');
    });

    it('bloquea si está CANCELADA', () => {
      const acceso = service.evaluarAccesoDe({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.CANCELADA,
      });
      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('SUSCRIPCION_CANCELADA');
    });
  });

  describe('evaluarAcceso', () => {
    it('bloquea si la cuenta no está aprobada, sin consultar la suscripción', async () => {
      veterinariosRepository.findOne.mockResolvedValue({
        ...veterinarioAprobado,
        estadoValidacion: ValidationStatus.PENDIENTE,
      });

      const acceso = await service.evaluarAcceso(ID_VETERINARIO);

      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('CUENTA_NO_APROBADA');
      expect(suscripcionesRepository.findOne).not.toHaveBeenCalled();
    });

    it('bloquea si la cuenta de veterinario no existe', async () => {
      veterinariosRepository.findOne.mockResolvedValue(null);

      const acceso = await service.evaluarAcceso(ID_VETERINARIO);

      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('CUENTA_NO_APROBADA');
    });

    it('no crea la suscripción si no existe (es una lectura)', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue(null);

      const acceso = await service.evaluarAcceso(ID_VETERINARIO);

      expect(acceso.accesoPermitido).toBe(false);
      expect(acceso.codigo).toBe('SUSCRIPCION_PENDIENTE');
      expect(suscripcionesRepository.create).not.toHaveBeenCalled();
    });

    it('permite si la cuenta está aprobada y la suscripción ACTIVA', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinarioAprobado);
      suscripcionesRepository.findOne.mockResolvedValue({
        ...suscripcionPendiente,
        estado: SuscripcionEstado.ACTIVA,
      });

      const acceso = await service.evaluarAcceso(ID_VETERINARIO);

      expect(acceso.accesoPermitido).toBe(true);
      expect(acceso.codigo).toBeNull();
      expect(acceso.motivo).toBeNull();
    });
  });
});

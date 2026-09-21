import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionesDeteccionesService } from './notificaciones-detecciones.service';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesDeteccionesService', () => {
  let service: NotificacionesDeteccionesService;
  let notificacionesRepository: { findOne: jest.Mock };
  let notificacionesService: { crear: jest.Mock };

  const ID_REPORTE = 7;
  const ID_DUENIO = 3;

  // Con componentes locales para que la hora del texto no dependa de la zona
  // horaria donde corran los tests.
  const DETECTADO_EN = new Date(2026, 8, 21, 18, 30);

  const datos = () => ({
    idReporte: ID_REPORTE,
    idDuenio: ID_DUENIO,
    nombreMascota: 'Firulais',
    detectadoEn: DETECTADO_EN,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesDeteccionesService,
        {
          provide: getRepositoryToken(Notificacion),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: NotificacionesService,
          useValue: { crear: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(NotificacionesDeteccionesService);
    notificacionesRepository = module.get(getRepositoryToken(Notificacion));
    notificacionesService = module.get(NotificacionesService);
  });

  it('avisa al dueño con la hora de la detección', async () => {
    notificacionesRepository.findOne.mockResolvedValue(null);

    await expect(service.notificarDeteccion(datos())).resolves.toBe(true);

    expect(notificacionesService.crear).toHaveBeenCalledTimes(1);
    const [idUsuario, tipo, titulo, cuerpo, idReferencia] =
      notificacionesService.crear.mock.calls[0] as [
        number,
        NotificationType,
        string,
        string,
        number,
      ];

    expect(idUsuario).toBe(ID_DUENIO);
    expect(tipo).toBe(NotificationType.MASCOTA_DETECTADA);
    expect(titulo).toContain('Firulais');
    expect(cuerpo).toContain('18:30');
    // Es lo que le permite a la app abrir la última ubicación de ese reporte.
    expect(idReferencia).toBe(ID_REPORTE);
  });

  it('agrupa las detecciones seguidas en un solo aviso', async () => {
    // Ya hay un aviso de este reporte dentro de la ventana.
    notificacionesRepository.findOne.mockResolvedValue({ idNotificacion: 1 });

    await expect(service.notificarDeteccion(datos())).resolves.toBe(false);

    expect(notificacionesService.crear).not.toHaveBeenCalled();
  });

  it('busca el aviso previo del mismo reporte, no de cualquiera', async () => {
    notificacionesRepository.findOne.mockResolvedValue(null);

    await service.notificarDeteccion(datos());

    const [consulta] = notificacionesRepository.findOne.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(consulta.where.tipo).toBe(NotificationType.MASCOTA_DETECTADA);
    expect(consulta.where.idReferencia).toBe(ID_REPORTE);
    // La ventana se aplica sobre la fecha de envío del aviso anterior.
    expect(consulta.where.fechaEnvio).toBeDefined();
  });

  it('usa un texto genérico si la mascota no tiene nombre', async () => {
    notificacionesRepository.findOne.mockResolvedValue(null);

    await service.notificarDeteccion({ ...datos(), nombreMascota: null });

    const [, , titulo] = notificacionesService.crear.mock.calls[0] as [
      number,
      NotificationType,
      string,
    ];
    expect(titulo).toContain('tu mascota');
  });

  it('no propaga el error si falla al guardar el aviso', async () => {
    notificacionesRepository.findOne.mockResolvedValue(null);
    notificacionesService.crear.mockRejectedValue(new Error('base caída'));

    // La detección ya se guardó: que no se pueda avisar no la invalida.
    await expect(service.notificarDeteccion(datos())).resolves.toBe(false);
  });
});

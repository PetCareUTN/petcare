import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClinicalEventType } from '../common/enums/clinical-event-type.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { TipoVacuna } from '../common/enums/tipo-vacuna.enum';
import { EventoClinico } from '../eventos-clinicos/entities/evento-clinico.entity';
import { NotificacionesService } from './notificaciones.service';
import { RecordatoriosVacunasService } from './recordatorios-vacunas.service';

describe('RecordatoriosVacunasService (US-40)', () => {
  let service: RecordatoriosVacunasService;
  let eventosRepository: {
    find: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  let notificacionesService: { crear: jest.Mock };

  const duenio = (idUsuario: number, recordatoriosVacunas = true) =>
    ({ idUsuario, recordatoriosVacunas }) as never;

  const eventoDeVacuna = (overrides: Partial<EventoClinico> = {}) =>
    ({
      idEvento: 1,
      tipo: ClinicalEventType.VACUNA,
      fecha: '2026-09-01',
      vacuna: TipoVacuna.ANTIRRABICA,
      proximaAplicacion: '2027-09-01',
      recordatorioEnviadoAt: null,
      historia: {
        idHistoria: 20,
        mascota: { idMascota: 10, nombre: 'Rocky', usuarios: [duenio(1)] },
      },
      ...overrides,
    }) as EventoClinico;

  beforeEach(async () => {
    eventosRepository = {
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue(undefined),
    };
    notificacionesService = { crear: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordatoriosVacunasService,
        {
          provide: getRepositoryToken(EventoClinico),
          useValue: eventosRepository,
        },
        { provide: NotificacionesService, useValue: notificacionesService },
      ],
    }).compile();

    service = module.get(RecordatoriosVacunasService);
  });

  it('notifica al dueño de una dosis que esta por vencer', async () => {
    eventosRepository.find.mockResolvedValue([eventoDeVacuna()]);

    const enviados = await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(enviados).toBe(1);
    expect(notificacionesService.crear).toHaveBeenCalledWith(
      1,
      NotificationType.RECORDATORIO_VACUNA,
      'Recordatorio de vacunación',
      expect.stringContaining('Rocky'),
    );
  });

  it('el mensaje nombra la vacuna y la fecha, como pide el criterio', async () => {
    eventosRepository.find.mockResolvedValue([eventoDeVacuna()]);

    await service.enviarRecordatorios(new Date('2026-09-18'));

    const cuerpo = notificacionesService.crear.mock.calls[0][3] as string;
    expect(cuerpo).toContain('Rocky');
    expect(cuerpo).toContain('antirrábica');
    expect(cuerpo).toContain('01/09/2027');
  });

  it('no notifica una dosis que el dueño ya reaplico', async () => {
    eventosRepository.find.mockResolvedValue([eventoDeVacuna()]);
    // Hay un evento posterior de la misma vacuna: ya se dio.
    eventosRepository.count.mockResolvedValue(1);

    const enviados = await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(enviados).toBe(0);
    expect(notificacionesService.crear).not.toHaveBeenCalled();
    // Igual se marca, para no volver a evaluarla todos los días.
    expect(eventosRepository.update).toHaveBeenCalledWith(
      { idEvento: 1 },
      expect.objectContaining({ recordatorioEnviadoAt: expect.any(Date) }),
    );
  });

  it('marca la dosis como avisada para no repetir el aviso al dia siguiente', async () => {
    eventosRepository.find.mockResolvedValue([eventoDeVacuna()]);

    await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(eventosRepository.update).toHaveBeenCalledWith(
      { idEvento: 1 },
      expect.objectContaining({ recordatorioEnviadoAt: expect.any(Date) }),
    );
  });

  it('avisa a todos los dueños de la mascota', async () => {
    eventosRepository.find.mockResolvedValue([
      eventoDeVacuna({
        historia: {
          idHistoria: 20,
          mascota: {
            idMascota: 10,
            nombre: 'Rocky',
            usuarios: [duenio(1), duenio(2)],
          },
        } as never,
      }),
    ]);

    await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(notificacionesService.crear).toHaveBeenCalledTimes(2);
  });

  it('respeta al dueño que desactivo los recordatorios', async () => {
    eventosRepository.find.mockResolvedValue([
      eventoDeVacuna({
        historia: {
          idHistoria: 20,
          mascota: {
            idMascota: 10,
            nombre: 'Rocky',
            usuarios: [duenio(1, false), duenio(2, true)],
          },
        } as never,
      }),
    ]);

    await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(notificacionesService.crear).toHaveBeenCalledTimes(1);
    expect(notificacionesService.crear).toHaveBeenCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it('no notifica si ninguno de los dueños quiere recordatorios', async () => {
    eventosRepository.find.mockResolvedValue([
      eventoDeVacuna({
        historia: {
          idHistoria: 20,
          mascota: {
            idMascota: 10,
            nombre: 'Rocky',
            usuarios: [duenio(1, false)],
          },
        } as never,
      }),
    ]);

    const enviados = await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(enviados).toBe(0);
    expect(notificacionesService.crear).not.toHaveBeenCalled();
  });

  it('un fallo al notificar a un dueño no corta el resto', async () => {
    eventosRepository.find.mockResolvedValue([
      eventoDeVacuna({
        historia: {
          idHistoria: 20,
          mascota: {
            idMascota: 10,
            nombre: 'Rocky',
            usuarios: [duenio(1), duenio(2)],
          },
        } as never,
      }),
    ]);
    notificacionesService.crear
      .mockRejectedValueOnce(new Error('caida transitoria'))
      .mockResolvedValueOnce(undefined);

    const enviados = await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(enviados).toBe(1);
    expect(notificacionesService.crear).toHaveBeenCalledTimes(2);
  });

  it('no explota si el evento quedo sin mascota asociada', async () => {
    eventosRepository.find.mockResolvedValue([
      eventoDeVacuna({ historia: { idHistoria: 20 } as never }),
    ]);

    const enviados = await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(enviados).toBe(0);
    expect(notificacionesService.crear).not.toHaveBeenCalled();
  });

  it('sin dosis por vencer no hace nada', async () => {
    eventosRepository.find.mockResolvedValue([]);

    const enviados = await service.enviarRecordatorios(new Date('2026-09-18'));

    expect(enviados).toBe(0);
    expect(notificacionesService.crear).not.toHaveBeenCalled();
    expect(eventosRepository.update).not.toHaveBeenCalled();
  });
});

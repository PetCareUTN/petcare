import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../common/enums/notification-type.enum';
import {
  DatosTurno,
  NotificacionesTurnosService,
} from './notificaciones-turnos.service';
import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesTurnosService', () => {
  let service: NotificacionesTurnosService;
  let notificacionesService: { crear: jest.Mock };

  const turno: DatosTurno = {
    idDuenio: 12,
    idPrestador: 99,
    nombreDuenio: 'Ana Gomez',
    nombrePrestador: 'Clinica San Roque',
    nombreMascota: 'Luna',
    fecha: '2026-09-01',
    hora: '10:00',
    servicio: 'consulta veterinaria',
  };

  beforeEach(async () => {
    notificacionesService = { crear: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesTurnosService,
        { provide: NotificacionesService, useValue: notificacionesService },
      ],
    }).compile();

    service = module.get<NotificacionesTurnosService>(
      NotificacionesTurnosService,
    );
  });

  describe('notificarTurnoConfirmado', () => {
    it('notifica al dueño y al prestador', async () => {
      await service.notificarTurnoConfirmado(turno);

      expect(notificacionesService.crear).toHaveBeenCalledTimes(2);
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        12,
        NotificationType.TURNO_CONFIRMADO,
        'Turno confirmado',
        expect.stringContaining('Luna'),
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        99,
        NotificationType.TURNO_CONFIRMADO,
        'Nuevo turno reservado',
        expect.stringContaining('Ana Gomez'),
      );
    });

    it('muestra la fecha en formato DD/MM/YYYY', async () => {
      await service.notificarTurnoConfirmado(turno);

      const [, , , cuerpo] = notificacionesService.crear.mock.calls[0];
      expect(cuerpo).toContain('01/09/2026 a las 10:00');
    });

    it('recorta los segundos que agrega Postgres a la hora', async () => {
      await service.notificarTurnoConfirmado({ ...turno, hora: '09:30:00' });

      const [, , , cuerpo] = notificacionesService.crear.mock.calls[0];
      expect(cuerpo).toContain('a las 09:30.');
      expect(cuerpo).not.toContain('09:30:00');
    });
  });

  describe('notificarTurnoCancelado', () => {
    it('avisa al prestador cuando cancela el dueño', async () => {
      await service.notificarTurnoCancelado(turno, 'duenio', 'Me surgió un viaje');

      expect(notificacionesService.crear).toHaveBeenCalledTimes(1);
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        99,
        NotificationType.TURNO_CANCELADO,
        'Turno cancelado',
        expect.stringContaining('Ana Gomez canceló'),
      );
      const [, , , cuerpo] = notificacionesService.crear.mock.calls[0];
      expect(cuerpo).toContain('Motivo: Me surgió un viaje');
    });

    it('avisa al dueño cuando cancela el prestador', async () => {
      await service.notificarTurnoCancelado(turno, 'prestador', null);

      expect(notificacionesService.crear).toHaveBeenCalledTimes(1);
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        12,
        NotificationType.TURNO_CANCELADO,
        'Turno cancelado',
        expect.stringContaining('Clinica San Roque canceló'),
      );
    });

    it('omite el motivo cuando no se informó ninguno', async () => {
      await service.notificarTurnoCancelado(turno, 'prestador', null);

      const [, , , cuerpo] = notificacionesService.crear.mock.calls[0];
      expect(cuerpo).not.toContain('Motivo:');
    });
  });

  it('no propaga el error si falla el registro de la notificación', async () => {
    notificacionesService.crear.mockRejectedValue(new Error('base caída'));

    await expect(
      service.notificarTurnoConfirmado(turno),
    ).resolves.toBeUndefined();
  });
});

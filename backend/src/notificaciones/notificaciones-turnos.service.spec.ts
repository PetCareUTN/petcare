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
    idTurno: 7,
    tipoTurno: 'turno_veterinario',
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
        7,
        'turno_veterinario',
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        99,
        NotificationType.TURNO_CONFIRMADO,
        'Nuevo turno reservado',
        expect.stringContaining('Ana Gomez'),
        7,
        'turno_veterinario',
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

  describe('turno agendado por la veterinaria', () => {
    const turnoDeLaVeterinaria: DatosTurno = {
      ...turno,
      creadoPor: 'veterinario',
      duenios: [
        { idUsuario: 12, nombre: 'Ana Gomez' },
        { idUsuario: 13, nombre: 'Marta Paz' },
      ],
    };

    it('avisa a todos los dueños que se les agendó un turno', async () => {
      await service.notificarTurnoConfirmado(turnoDeLaVeterinaria);

      expect(notificacionesService.crear).toHaveBeenCalledTimes(2);
      for (const idDuenio of [12, 13]) {
        expect(notificacionesService.crear).toHaveBeenCalledWith(
          idDuenio,
          NotificationType.TURNO_CONFIRMADO,
          'Turno confirmado',
          expect.stringContaining('te agendó un turno'),
          7,
          'turno_veterinario',
        );
      }
    });

    it('no le avisa a la veterinaria de un turno que cargó ella', async () => {
      await service.notificarTurnoConfirmado(turnoDeLaVeterinaria);

      const destinatarios = notificacionesService.crear.mock.calls.map(
        ([idUsuario]: [number]) => idUsuario,
      );
      expect(destinatarios).not.toContain(99);
    });
  });

  describe('mascota compartida con varios dueños', () => {
    const turnoCompartido: DatosTurno = {
      ...turno,
      duenios: [
        { idUsuario: 12, nombre: 'Ana Gomez' },
        { idUsuario: 13, nombre: 'Marta Paz' },
      ],
    };

    it('avisa de la reserva a todos los dueños, cada uno con su texto', async () => {
      await service.notificarTurnoConfirmado(turnoCompartido);

      expect(notificacionesService.crear).toHaveBeenCalledTimes(3);
      // Quien reservó: "tu turno".
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        12,
        NotificationType.TURNO_CONFIRMADO,
        'Turno confirmado',
        expect.stringContaining('Tu turno'),
        7,
        'turno_veterinario',
      );
      // El otro dueño: quién lo reservó.
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        13,
        NotificationType.TURNO_CONFIRMADO,
        'Turno confirmado',
        expect.stringContaining('Ana Gomez reservó'),
        7,
        'turno_veterinario',
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        99,
        NotificationType.TURNO_CONFIRMADO,
        'Nuevo turno reservado',
        expect.any(String),
        7,
        'turno_veterinario',
      );
    });

    it('si cancela un dueño, avisa al prestador y al otro dueño pero no a quien canceló', async () => {
      await service.notificarTurnoCancelado(
        turnoCompartido,
        'duenio',
        null,
        13,
      );

      const destinatarios = notificacionesService.crear.mock.calls.map(
        ([id]) => id as number,
      );
      expect(destinatarios.sort()).toEqual([12, 99]);
      const [, , , cuerpo] = notificacionesService.crear.mock.calls.find(
        ([id]) => id === 12,
      ) as [number, string, string, string];
      expect(cuerpo).toContain('Marta Paz canceló');
    });

    it('si cancela el prestador, avisa a todos los dueños', async () => {
      await service.notificarTurnoCancelado(turnoCompartido, 'prestador', null);

      const destinatarios = notificacionesService.crear.mock.calls.map(
        ([id]) => id as number,
      );
      expect(destinatarios.sort()).toEqual([12, 13]);
    });

    it('no repite avisos si un dueño figura dos veces', async () => {
      await service.notificarTurnoCancelado(
        {
          ...turno,
          duenios: [
            { idUsuario: 12, nombre: 'Ana Gomez' },
            { idUsuario: 12, nombre: 'Ana Gomez' },
          ],
        },
        'prestador',
        null,
      );

      expect(notificacionesService.crear).toHaveBeenCalledTimes(1);
    });
  });

  describe('notificarTurnoCancelado', () => {
    it('avisa al prestador cuando cancela el dueño', async () => {
      await service.notificarTurnoCancelado(
        turno,
        'duenio',
        'Me surgió un viaje',
      );

      expect(notificacionesService.crear).toHaveBeenCalledTimes(1);
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        99,
        NotificationType.TURNO_CANCELADO,
        'Turno cancelado',
        expect.stringContaining('Ana Gomez canceló'),
        7,
        'turno_veterinario',
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
        7,
        'turno_veterinario',
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

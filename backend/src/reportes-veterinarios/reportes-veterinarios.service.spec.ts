import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { DiaSemana } from '../common/enums/dia-semana.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { DisponibilidadVeterinaria } from '../disponibilidades-veterinarias/entities/disponibilidad-veterinaria.entity';
import { TurnoVeterinario } from '../turnos-veterinarios/entities/turno-veterinario.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { ReportesVeterinariosService } from './reportes-veterinarios.service';

describe('ReportesVeterinariosService', () => {
  let service: ReportesVeterinariosService;
  let turnosRepository: { find: jest.Mock };
  let disponibilidadesRepository: { find: jest.Mock };
  let veterinariosRepository: { findOne: jest.Mock };

  const veterinario = {
    idVeterinario: 7,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  const turno = (over: Partial<TurnoVeterinario>): TurnoVeterinario =>
    ({
      idTurno: Math.random(),
      estado: AppointmentStatus.CONFIRMADO,
      ...over,
    }) as TurnoVeterinario;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesVeterinariosService,
        {
          provide: getRepositoryToken(TurnoVeterinario),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(DisponibilidadVeterinaria),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ReportesVeterinariosService);
    turnosRepository = module.get(getRepositoryToken(TurnoVeterinario));
    disponibilidadesRepository = module.get(
      getRepositoryToken(DisponibilidadVeterinaria),
    );
    veterinariosRepository = module.get(getRepositoryToken(Veterinario));

    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    disponibilidadesRepository.find.mockResolvedValue([]);
  });

  it('rechaza a un veterinario no validado', async () => {
    veterinariosRepository.findOne.mockResolvedValue(null);
    turnosRepository.find.mockResolvedValue([]);

    await expect(
      service.obtenerDashboard(99, '2026-08-01', '2026-08-31'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('calcula el resumen y agrupa turnos por mes dentro del rango', async () => {
    const turnos = [
      turno({
        fecha: '2026-08-05',
        hora: '10:00',
        mascota: { idMascota: 1 } as any,
      }),
      turno({
        fecha: '2026-08-06',
        hora: '11:00',
        mascota: { idMascota: 2 } as any,
      }),
      turno({
        fecha: '2026-08-07',
        hora: '10:00',
        estado: AppointmentStatus.CANCELADO,
        mascota: { idMascota: 1 } as any,
      }),
      turno({
        fecha: '2026-09-01',
        hora: '09:00',
        mascota: { idMascota: 1 } as any,
      }),
    ];
    turnosRepository.find
      .mockResolvedValueOnce(turnos)
      .mockResolvedValueOnce([]) // período anterior
      .mockResolvedValueOnce(turnos);

    const result = await service.obtenerDashboard(
      1,
      '2026-08-01',
      '2026-09-30',
    );

    expect(result.resumen).toEqual({
      totalTurnos: 4,
      confirmados: 3,
      // Ningun turno del fixture esta cerrado todavia: los tres confirmados
      // figuran como pendientes de registrar y el ausentismo queda en 0.
      asistidos: 0,
      ausentes: 0,
      sinRegistrar: 3,
      sobreturnos: 0,
      tasaAusentismo: 0,
      cancelados: 1,
      tasaCancelacion: 25,
      pacientesAtendidos: 2,
    });
    expect(result.turnosPorMes).toEqual([
      { mes: '2026-08', etiqueta: 'Ago 2026', confirmados: 2, cancelados: 1 },
      { mes: '2026-09', etiqueta: 'Sep 2026', confirmados: 1, cancelados: 0 },
    ]);
  });

  // P1-193: antes, un turno cerrado dejaba de contar como ocurrido, la tasa de
  // cancelacion se inflaba sola y la mascota atendida desaparecia del reporte.
  it('cuenta los turnos cerrados como ocurridos y separa asistidos de ausentes', async () => {
    const turnos = [
      turno({
        fecha: '2026-08-05',
        hora: '10:00',
        estado: AppointmentStatus.ASISTIO,
        mascota: { idMascota: 1 } as TurnoVeterinario['mascota'],
      }),
      turno({
        fecha: '2026-08-06',
        hora: '11:00',
        estado: AppointmentStatus.AUSENTE,
        mascota: { idMascota: 2 } as TurnoVeterinario['mascota'],
      }),
      turno({
        fecha: '2026-08-07',
        hora: '12:00',
        mascota: { idMascota: 3 } as TurnoVeterinario['mascota'],
      }),
      turno({
        fecha: '2026-08-08',
        hora: '13:00',
        estado: AppointmentStatus.CANCELADO,
        mascota: { idMascota: 4 } as TurnoVeterinario['mascota'],
      }),
    ];
    turnosRepository.find
      .mockResolvedValueOnce(turnos)
      .mockResolvedValueOnce([]) // período anterior
      .mockResolvedValueOnce(turnos);

    const result = await service.obtenerDashboard(
      1,
      '2026-08-01',
      '2026-08-31',
    );

    expect(result.resumen).toEqual({
      totalTurnos: 4,
      confirmados: 3,
      asistidos: 1,
      ausentes: 1,
      sinRegistrar: 1,
      sobreturnos: 0,
      // 1 ausente sobre los 2 turnos ya cerrados.
      tasaAusentismo: 50,
      cancelados: 1,
      // Sobre los 4 turnos, no sobre los 2 que quedaban sin cerrar.
      tasaCancelacion: 25,
      // El ausente ocupo el cupo pero no fue atendido.
      pacientesAtendidos: 2,
    });
    expect(result.turnosPorMes).toEqual([
      { mes: '2026-08', etiqueta: 'Ago 2026', confirmados: 3, cancelados: 1 },
    ]);
  });

  it('calcula la ocupacion por dia de la semana en base a la disponibilidad configurada', async () => {
    // 2026-08-03 es lunes; en agosto de 2026 hay 4 lunes (3, 10, 17, 24, 31 -> 5 lunes en realidad).
    disponibilidadesRepository.find.mockResolvedValue([
      {
        diaSemana: DiaSemana.LUNES,
        horaInicio: '10:00',
        horaFin: '11:00',
        cuposPorTurno: 1,
      } as DisponibilidadVeterinaria,
    ]);
    const turnos = [
      turno({
        fecha: '2026-08-03',
        hora: '10:00',
        mascota: { idMascota: 1 } as any,
      }),
    ];
    turnosRepository.find
      .mockResolvedValueOnce(turnos)
      .mockResolvedValueOnce([]) // período anterior
      .mockResolvedValueOnce(turnos);

    const result = await service.obtenerDashboard(
      1,
      '2026-08-01',
      '2026-08-31',
    );

    const ocupacionLunes = result.ocupacionPorDia.find(
      (o) => o.diaSemana === DiaSemana.LUNES,
    );
    // 1 hora / 30' = 2 slots por lunes * 1 cupo = 2 de capacidad semanal.
    // Agosto 2026 tiene 5 lunes -> capacidad total 10. Ocupados: 1.
    expect(ocupacionLunes).toEqual({
      diaSemana: DiaSemana.LUNES,
      etiqueta: 'Lunes',
      ocupados: 1,
      capacidad: 10,
      porcentaje: 10,
    });
  });

  it('agrupa los horarios pico por hora del dia, ordenados cronologicamente', async () => {
    const turnos = [
      turno({
        fecha: '2026-08-05',
        hora: '14:00',
        mascota: { idMascota: 1 } as any,
      }),
      turno({
        fecha: '2026-08-06',
        hora: '09:00',
        mascota: { idMascota: 1 } as any,
      }),
      turno({
        fecha: '2026-08-07',
        hora: '09:30',
        mascota: { idMascota: 1 } as any,
      }),
    ];
    turnosRepository.find
      .mockResolvedValueOnce(turnos)
      .mockResolvedValueOnce([]) // período anterior
      .mockResolvedValueOnce(turnos);

    const result = await service.obtenerDashboard(
      1,
      '2026-08-01',
      '2026-08-31',
    );

    expect(result.horariosPico).toEqual([
      { hora: 9, etiqueta: '09:00', cantidad: 2 },
      { hora: 14, etiqueta: '14:00', cantidad: 1 },
    ]);
  });

  it('distingue pacientes nuevos de recurrentes segun su primer turno de siempre', async () => {
    const enRango = [
      // Mascota 1 ya habia sido atendida antes del rango -> recurrente en agosto.
      turno({
        fecha: '2026-08-10',
        hora: '10:00',
        mascota: { idMascota: 1 } as any,
      }),
      // Mascota 2 aparece por primera vez en agosto -> nueva.
      turno({
        fecha: '2026-08-15',
        hora: '10:00',
        mascota: { idMascota: 2 } as any,
      }),
    ];
    const historicoCompleto = [
      turno({
        fecha: '2026-05-01',
        hora: '10:00',
        mascota: { idMascota: 1 } as any,
      }),
      ...enRango,
    ];
    turnosRepository.find
      .mockResolvedValueOnce(enRango) // turnos en rango
      .mockResolvedValueOnce([]) // período anterior
      .mockResolvedValueOnce(historicoCompleto); // todos los confirmados

    const result = await service.obtenerDashboard(
      1,
      '2026-08-01',
      '2026-08-31',
    );

    expect(result.pacientesPorMes).toEqual([
      { mes: '2026-08', etiqueta: 'Ago 2026', nuevos: 1, recurrentes: 1 },
    ]);
  });

  it('usa los ultimos 6 meses como rango por defecto cuando no se especifica', async () => {
    turnosRepository.find.mockResolvedValue([]);

    const result = await service.obtenerDashboard(1);

    expect(result.turnosPorMes).toHaveLength(6);
  });

  it('calcula el resumen del período anterior de igual duración para comparar', async () => {
    const actual = [
      turno({ fecha: '2026-09-05', hora: '10:00', mascota: { idMascota: 1 } as any }),
      turno({ fecha: '2026-09-06', hora: '11:00', mascota: { idMascota: 2 } as any }),
    ];
    const anterior = [
      turno({ fecha: '2026-08-05', hora: '10:00', mascota: { idMascota: 1 } as any }),
      turno({
        fecha: '2026-08-06',
        hora: '11:00',
        estado: AppointmentStatus.CANCELADO,
        mascota: { idMascota: 2 } as any,
      }),
    ];
    turnosRepository.find
      .mockResolvedValueOnce(actual)
      .mockResolvedValueOnce(anterior)
      .mockResolvedValueOnce(actual);

    const result = await service.obtenerDashboard(1, '2026-09-01', '2026-09-30');

    // Los 30 días anteriores a septiembre: del 2 al 31 de agosto.
    const rangoAnterior = (turnosRepository.find.mock.calls[1][0] as any).where.fecha;
    expect(rangoAnterior.value).toEqual(['2026-08-02', '2026-08-31']);
    expect(result.resumen.totalTurnos).toBe(2);
    expect(result.resumenAnterior.totalTurnos).toBe(2);
    expect(result.resumenAnterior.cancelados).toBe(1);
    expect(result.resumenAnterior.tasaCancelacion).toBe(50);
  });
});

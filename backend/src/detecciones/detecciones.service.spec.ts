import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportePerdidaEstado } from '../common/enums/reporte-perdida-estado.enum';
import { ReportesPerdidaService } from '../reportes-perdida/reportes-perdida.service';
import { TagBle } from '../tags-ble/entities/tag-ble.entity';
import { DeteccionesService } from './detecciones.service';
import { RegistrarDeteccionDto } from './dto/registrar-deteccion.dto';
import { Deteccion } from './entities/deteccion.entity';

describe('DeteccionesService', () => {
  let service: DeteccionesService;
  let deteccionesRepository: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };
  let tagsBleRepository: { findOne: jest.Mock };
  let reportesPerdidaService: {
    buscarReporteActivo: jest.Mock;
    buscarReporteDelDuenio: jest.Mock;
  };
  let insertBuilder: {
    insert: jest.Mock;
    into: jest.Mock;
    values: jest.Mock;
    orIgnore: jest.Mock;
    execute: jest.Mock;
  };

  const ID_MASCOTA = 45;
  const ID_REPORTE = 7;

  const tagVinculado = {
    idTagBle: 1,
    tagId: 'C3BBDE4B02A1',
    mascota: { idMascota: ID_MASCOTA },
  } as TagBle;

  const reporteActivo = {
    idReporte: ID_REPORTE,
    estado: ReportePerdidaEstado.ACTIVO,
    fechaPerdida: new Date('2026-09-12T15:00:00.000Z'),
  };

  const dto = (): RegistrarDeteccionDto => ({
    deteccionId: '9f1c0b6e-3a41-4a2e-8c77-1f2b5d9e0a33',
    tagId: 'C3BBDE4B02A1',
    rssi: -67,
    detectadoEn: '2026-09-12T18:30:00.000Z',
    latitud: -31.42,
    longitud: -64.189,
    precisionMetros: 25,
  });

  beforeEach(async () => {
    insertBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ raw: [{ id_deteccion: 1 }] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeteccionesService,
        {
          provide: getRepositoryToken(Deteccion),
          useValue: {
            createQueryBuilder: jest.fn(() => insertBuilder),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TagBle),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: ReportesPerdidaService,
          useValue: {
            buscarReporteActivo: jest.fn(),
            buscarReporteDelDuenio: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DeteccionesService);
    deteccionesRepository = module.get(getRepositoryToken(Deteccion));
    tagsBleRepository = module.get(getRepositoryToken(TagBle));
    reportesPerdidaService = module.get(ReportesPerdidaService);
  });

  it('registra la detección de una mascota reportada como perdida', async () => {
    tagsBleRepository.findOne.mockResolvedValue(tagVinculado);
    reportesPerdidaService.buscarReporteActivo.mockResolvedValue(reporteActivo);

    await expect(service.registrar(dto())).resolves.toBe('registrada');

    expect(reportesPerdidaService.buscarReporteActivo).toHaveBeenCalledWith(
      ID_MASCOTA,
    );
    expect(insertBuilder.values).toHaveBeenCalledWith({
      deteccionUuid: dto().deteccionId,
      reporte: { idReporte: ID_REPORTE },
      tagId: dto().tagId,
      rssi: -67,
      latitud: -31.42,
      longitud: -64.189,
      precisionMetros: 25,
      detectadoEn: new Date('2026-09-12T18:30:00.000Z'),
    });
  });

  it('no guarda nada que identifique al detector', async () => {
    tagsBleRepository.findOne.mockResolvedValue(tagVinculado);
    reportesPerdidaService.buscarReporteActivo.mockResolvedValue(reporteActivo);

    await service.registrar(dto());

    const [guardado] = insertBuilder.values.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(Object.keys(guardado).sort()).toEqual(
      [
        'deteccionUuid',
        'detectadoEn',
        'latitud',
        'longitud',
        'precisionMetros',
        'reporte',
        'rssi',
        'tagId',
      ].sort(),
    );
  });

  it('descarta la detección de un tag que no está vinculado a ninguna mascota', async () => {
    tagsBleRepository.findOne.mockResolvedValue(null);

    await expect(service.registrar(dto())).resolves.toBe('descartada');

    expect(reportesPerdidaService.buscarReporteActivo).not.toHaveBeenCalled();
    expect(insertBuilder.execute).not.toHaveBeenCalled();
  });

  it('descarta la detección de una mascota que no está perdida', async () => {
    tagsBleRepository.findOne.mockResolvedValue(tagVinculado);
    reportesPerdidaService.buscarReporteActivo.mockResolvedValue(null);

    await expect(service.registrar(dto())).resolves.toBe('descartada');

    expect(insertBuilder.execute).not.toHaveBeenCalled();
  });

  it('descarta lo detectado antes de que la mascota se perdiera', async () => {
    tagsBleRepository.findOne.mockResolvedValue(tagVinculado);
    reportesPerdidaService.buscarReporteActivo.mockResolvedValue(reporteActivo);

    await expect(
      service.registrar({ ...dto(), detectadoEn: '2026-09-12T14:59:59.000Z' }),
    ).resolves.toBe('descartada');

    expect(insertBuilder.execute).not.toHaveBeenCalled();
  });

  it('no duplica una detección que el celular reenvía', async () => {
    tagsBleRepository.findOne.mockResolvedValue(tagVinculado);
    reportesPerdidaService.buscarReporteActivo.mockResolvedValue(reporteActivo);
    insertBuilder.execute.mockResolvedValue({ raw: [] });

    await expect(service.registrar(dto())).resolves.toBe('duplicada');

    expect(insertBuilder.orIgnore).toHaveBeenCalled();
  });

  it('rechaza una detección fechada en el futuro', async () => {
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await expect(
      service.registrar({ ...dto(), detectadoEn: enUnaHora }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tagsBleRepository.findOne).not.toHaveBeenCalled();
  });

  it('tolera un reloj de celular apenas adelantado', async () => {
    tagsBleRepository.findOne.mockResolvedValue(tagVinculado);
    reportesPerdidaService.buscarReporteActivo.mockResolvedValue(reporteActivo);
    const enUnMinuto = new Date(Date.now() + 60 * 1000).toISOString();

    await expect(
      service.registrar({ ...dto(), detectadoEn: enUnMinuto }),
    ).resolves.toBe('registrada');
  });

  describe('buscarUltimaDelReporte (US-37)', () => {
    const ID_USUARIO = 3;

    const reporteDelDuenio = {
      idReporte: ID_REPORTE,
      mascota: { idMascota: ID_MASCOTA, nombre: 'Firulais' },
    };

    const deteccion = {
      idDeteccion: 12,
      latitud: -31.421,
      longitud: -64.189,
      precisionMetros: 25,
      detectadoEn: new Date('2026-09-12T18:30:00.000Z'),
    };

    it('devuelve la última detección de la mascota perdida', async () => {
      reportesPerdidaService.buscarReporteDelDuenio.mockResolvedValue(
        reporteDelDuenio,
      );
      deteccionesRepository.findOne.mockResolvedValue(deteccion);

      const resultado = await service.buscarUltimaDelReporte(
        ID_REPORTE,
        ID_USUARIO,
      );

      expect(
        reportesPerdidaService.buscarReporteDelDuenio,
      ).toHaveBeenCalledWith(ID_REPORTE, ID_USUARIO);
      expect(resultado.nombreMascota).toBe('Firulais');
      expect(resultado.ultimaDeteccion).toEqual({
        latitud: -31.421,
        longitud: -64.189,
        precisionMetros: 25,
        // 25 del GPS + 80 del redondeo de coordenadas que hace el celular.
        radioAproximadoMetros: 105,
        detectadoEn: '2026-09-12T18:30:00.000Z',
      });
    });

    it('pide la más reciente por fecha de detección, no por fecha de alta', async () => {
      reportesPerdidaService.buscarReporteDelDuenio.mockResolvedValue(
        reporteDelDuenio,
      );
      deteccionesRepository.findOne.mockResolvedValue(deteccion);

      await service.buscarUltimaDelReporte(ID_REPORTE, ID_USUARIO);

      expect(deteccionesRepository.findOne).toHaveBeenCalledWith({
        where: { reporte: { idReporte: ID_REPORTE } },
        order: { detectadoEn: 'DESC', idDeteccion: 'DESC' },
      });
    });

    it('devuelve null cuando el reporte todavía no tiene detecciones', async () => {
      reportesPerdidaService.buscarReporteDelDuenio.mockResolvedValue(
        reporteDelDuenio,
      );
      deteccionesRepository.findOne.mockResolvedValue(null);

      const resultado = await service.buscarUltimaDelReporte(
        ID_REPORTE,
        ID_USUARIO,
      );

      // Estado vacío, no error: el reporte existe, todavía nadie la cruzó.
      expect(resultado.ultimaDeteccion).toBeNull();
      expect(resultado.idMascota).toBe(ID_MASCOTA);
    });

    it('no deja consultar la mascota de otro dueño', async () => {
      reportesPerdidaService.buscarReporteDelDuenio.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(
        service.buscarUltimaDelReporte(ID_REPORTE, 99),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(deteccionesRepository.findOne).not.toHaveBeenCalled();
    });
  });
});

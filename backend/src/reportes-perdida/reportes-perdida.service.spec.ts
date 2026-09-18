import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReportePerdidaEstado } from '../common/enums/reporte-perdida-estado.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { CreateReportePerdidaDto } from './dto/create-reporte-perdida.dto';
import { ReportePerdida } from './entities/reporte-perdida.entity';
import { ReportesPerdidaService } from './reportes-perdida.service';

describe('ReportesPerdidaService', () => {
  let service: ReportesPerdidaService;
  let reportesRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };

  const ID_DUENIO = 7;
  const ID_OTRO_USUARIO = 99;

  const mascotaPropia = {
    idMascota: 3,
    nombre: 'Rocco',
    foto: null,
    usuarios: [{ idUsuario: ID_DUENIO }],
  } as Mascota;

  const dto: CreateReportePerdidaDto = {
    idMascota: mascotaPropia.idMascota,
    latitud: -31.4201,
    longitud: -64.1888,
    descripcion: 'Collar rojo, se escapó por el portón',
    contacto: '351 555 5555',
  };

  beforeEach(async () => {
    reportesRepository = {
      findOne: jest.fn(),
      create: jest.fn((datos: Partial<ReportePerdida>) => datos),
      save: jest.fn((datos: Partial<ReportePerdida>): Promise<ReportePerdida> =>
        Promise.resolve({ idReporte: 1, ...datos } as ReportePerdida),
      ),
      createQueryBuilder: jest.fn(),
    };
    mascotasRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportesPerdidaService,
        {
          provide: getRepositoryToken(ReportePerdida),
          useValue: reportesRepository,
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: mascotasRepository,
        },
      ],
    }).compile();

    service = module.get<ReportesPerdidaService>(ReportesPerdidaService);
  });

  describe('crear', () => {
    it('reporta como perdida una mascota propia y deja el reporte activo', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      reportesRepository.findOne.mockResolvedValue(null);

      const reporte = await service.crear(ID_DUENIO, dto);

      expect(reporte.idMascota).toBe(mascotaPropia.idMascota);
      expect(reporte.estado).toBe(ReportePerdidaEstado.ACTIVO);
      expect(reporte.latitud).toBe(dto.latitud);
      expect(reporte.longitud).toBe(dto.longitud);
      expect(reporte.descripcion).toBe(dto.descripcion);
      expect(reporte.contacto).toBe(dto.contacto);
      expect(reporte.fechaCierre).toBeNull();
    });

    it('usa el momento del reporte cuando el dueño no indica desde cuándo falta', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      reportesRepository.findOne.mockResolvedValue(null);

      const antes = Date.now();
      const reporte = await service.crear(ID_DUENIO, dto);

      expect(new Date(reporte.fechaPerdida).getTime()).toBeGreaterThanOrEqual(
        antes,
      );
    });

    it('rechaza reportar la mascota de otro dueño', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);

      await expect(service.crear(ID_OTRO_USUARIO, dto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(reportesRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza reportar una mascota inexistente', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(service.crear(ID_DUENIO, dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza un segundo reporte mientras el anterior sigue abierto', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
      reportesRepository.findOne.mockResolvedValue({
        idReporte: 1,
        estado: ReportePerdidaEstado.ACTIVO,
      });

      await expect(service.crear(ID_DUENIO, dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('tieneReporteActivo', () => {
    it('acepta detecciones mientras la mascota tenga el reporte abierto', async () => {
      reportesRepository.findOne.mockResolvedValue({
        idReporte: 1,
        estado: ReportePerdidaEstado.ACTIVO,
      });

      await expect(
        service.tieneReporteActivo(mascotaPropia.idMascota),
      ).resolves.toBe(true);
    });

    it('deja de aceptar detecciones cuando no hay reporte abierto', async () => {
      reportesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.tieneReporteActivo(mascotaPropia.idMascota),
      ).resolves.toBe(false);
    });
  });

  describe('cerrar', () => {
    const reporteActivo = () =>
      ({
        idReporte: 1,
        mascota: mascotaPropia,
        estado: ReportePerdidaEstado.ACTIVO,
        fechaPerdida: new Date('2026-09-10T12:00:00.000Z'),
        latitud: dto.latitud,
        longitud: dto.longitud,
        descripcion: dto.descripcion ?? null,
        contacto: dto.contacto ?? null,
        fechaCierre: null,
      }) as ReportePerdida;

    it('marca la mascota como encontrada y registra la fecha de cierre', async () => {
      reportesRepository.findOne.mockResolvedValue(reporteActivo());

      const reporte = await service.cerrar(1, ID_DUENIO);

      expect(reporte.estado).toBe(ReportePerdidaEstado.CERRADO);
      expect(reporte.fechaCierre).not.toBeNull();
    });

    it('rechaza que otro usuario cierre el reporte', async () => {
      reportesRepository.findOne.mockResolvedValue(reporteActivo());

      await expect(service.cerrar(1, ID_OTRO_USUARIO)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(reportesRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza cerrar un reporte que ya está cerrado', async () => {
      reportesRepository.findOne.mockResolvedValue({
        ...reporteActivo(),
        estado: ReportePerdidaEstado.CERRADO,
        fechaCierre: new Date(),
      });

      await expect(service.cerrar(1, ID_DUENIO)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rechaza cerrar un reporte inexistente', async () => {
      reportesRepository.findOne.mockResolvedValue(null);

      await expect(service.cerrar(404, ID_DUENIO)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listarActivosDelUsuario', () => {
    it('devuelve solo los reportes abiertos de las mascotas del usuario', async () => {
      const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            idReporte: 1,
            mascota: mascotaPropia,
            estado: ReportePerdidaEstado.ACTIVO,
            fechaPerdida: new Date('2026-09-10T12:00:00.000Z'),
            latitud: dto.latitud,
            longitud: dto.longitud,
            descripcion: null,
            contacto: null,
            fechaCierre: null,
          },
        ]),
      };
      reportesRepository.createQueryBuilder.mockReturnValue(queryBuilder);

      const reportes = await service.listarActivosDelUsuario(ID_DUENIO);

      expect(reportes).toHaveLength(1);
      expect(reportes[0].idMascota).toBe(mascotaPropia.idMascota);
      expect(reportes[0].nombreMascota).toBe(mascotaPropia.nombre);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'reporte.estado = :estado',
        { estado: ReportePerdidaEstado.ACTIVO },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'usuario.idUsuario = :idUsuario',
        { idUsuario: ID_DUENIO },
      );
    });
  });
});

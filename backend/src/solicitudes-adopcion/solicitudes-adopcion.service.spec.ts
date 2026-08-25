import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdopcionStatus } from '../common/enums/adopcion-status.enum';
import { SolicitudAdopcionEstado } from '../common/enums/solicitud-adopcion-estado.enum';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { RechazarSolicitudAdopcionDto } from './dto/rechazar-solicitud-adopcion.dto';
import { SolicitudAdopcion } from './entities/solicitud-adopcion.entity';
import { SolicitudesAdopcionService } from './solicitudes-adopcion.service';

describe('SolicitudesAdopcionService', () => {
  let service: SolicitudesAdopcionService;
  let solicitudesRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let publicacionesRepository: {
    findOne: jest.Mock;
  };
  let usersRepository: {
    findOne: jest.Mock;
  };

  const ID_DUENIO = 1;
  const ID_INTERESADO = 2;
  const duenio = { idUsuario: ID_DUENIO } as User;
  const interesado = {
    idUsuario: ID_INTERESADO,
    nombre: 'Ana',
    apellido: 'Gomez',
    email: 'ana@example.com',
    telefono: '3811234567',
  } as User;

  const publicacionActiva = {
    idPublicacion: 5,
    estado: AdopcionStatus.ACTIVA,
    mascota: { idMascota: 10, nombre: 'Rocky' },
    usuario: duenio,
  } as PublicacionAdopcion;

  beforeEach(async () => {
    solicitudesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    publicacionesRepository = {
      findOne: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesAdopcionService,
        {
          provide: getRepositoryToken(SolicitudAdopcion),
          useValue: solicitudesRepository,
        },
        {
          provide: getRepositoryToken(PublicacionAdopcion),
          useValue: publicacionesRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
      ],
    }).compile();

    service = module.get<SolicitudesAdopcionService>(
      SolicitudesAdopcionService,
    );
  });

  describe('solicitar', () => {
    it('registra la solicitud asociada al solicitante y a la publicacion', async () => {
      const solicitud = {
        idSolicitud: 1,
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.PENDIENTE,
        motivoRechazo: null,
        createdAt: new Date('2026-08-20T10:00:00Z'),
        updatedAt: new Date('2026-08-20T10:00:00Z'),
      } as SolicitudAdopcion;

      publicacionesRepository.findOne.mockResolvedValue(publicacionActiva);
      solicitudesRepository.findOne.mockResolvedValue(null);
      usersRepository.findOne.mockResolvedValue(interesado);
      solicitudesRepository.create.mockReturnValue(solicitud);
      solicitudesRepository.save.mockResolvedValue(solicitud);

      const result = await service.solicitar(ID_INTERESADO, {
        idPublicacion: 5,
      });

      expect(solicitudesRepository.create).toHaveBeenCalledWith({
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.PENDIENTE,
      });
      expect(result.idPublicacion).toBe(5);
      expect(result.idSolicitante).toBe(ID_INTERESADO);
      expect(result.estado).toBe(SolicitudAdopcionEstado.PENDIENTE);
    });

    it('rechaza si la publicacion no existe o no esta activa', async () => {
      publicacionesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.solicitar(ID_INTERESADO, { idPublicacion: 999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(solicitudesRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza si el usuario intenta solicitar su propia publicacion', async () => {
      publicacionesRepository.findOne.mockResolvedValue(publicacionActiva);

      await expect(
        service.solicitar(ID_DUENIO, { idPublicacion: 5 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(solicitudesRepository.save).not.toHaveBeenCalled();
    });

    it('evita una segunda solicitud pendiente del mismo usuario sobre la misma publicacion', async () => {
      publicacionesRepository.findOne.mockResolvedValue(publicacionActiva);
      solicitudesRepository.findOne.mockResolvedValue({
        idSolicitud: 1,
        estado: SolicitudAdopcionEstado.PENDIENTE,
      });

      await expect(
        service.solicitar(ID_INTERESADO, { idPublicacion: 5 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(solicitudesRepository.findOne).toHaveBeenCalledWith({
        where: {
          publicacion: { idPublicacion: 5 },
          solicitante: { idUsuario: ID_INTERESADO },
          estado: SolicitudAdopcionEstado.PENDIENTE,
        },
      });
      expect(solicitudesRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza si el usuario autenticado ya no existe', async () => {
      publicacionesRepository.findOne.mockResolvedValue(publicacionActiva);
      solicitudesRepository.findOne.mockResolvedValue(null);
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.solicitar(ID_INTERESADO, { idPublicacion: 5 }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(solicitudesRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findRecibidas', () => {
    it('lista las solicitudes recibidas sobre publicaciones del usuario', async () => {
      const solicitud = {
        idSolicitud: 1,
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.PENDIENTE,
        motivoRechazo: null,
        createdAt: new Date('2026-08-20T10:00:00Z'),
      } as SolicitudAdopcion;
      solicitudesRepository.find.mockResolvedValue([solicitud]);

      const result = await service.findRecibidas(ID_DUENIO);

      expect(solicitudesRepository.find).toHaveBeenCalledWith({
        where: { publicacion: { usuario: { idUsuario: ID_DUENIO } } },
        relations: ['publicacion', 'publicacion.mascota', 'solicitante'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].idSolicitante).toBe(ID_INTERESADO);
    });
  });

  describe('aceptar', () => {
    it('acepta una solicitud pendiente propia', async () => {
      const solicitud = {
        idSolicitud: 1,
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.PENDIENTE,
        motivoRechazo: null,
      } as SolicitudAdopcion;
      solicitudesRepository.findOne.mockResolvedValue(solicitud);
      solicitudesRepository.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.aceptar(ID_DUENIO, 1);

      expect(result.estado).toBe(SolicitudAdopcionEstado.ACEPTADA);
      expect(result.motivoRechazo).toBeNull();
    });

    it('rechaza si el usuario no es dueño de la publicacion', async () => {
      const solicitud = {
        idSolicitud: 1,
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.PENDIENTE,
      } as SolicitudAdopcion;
      solicitudesRepository.findOne.mockResolvedValue(solicitud);

      await expect(service.aceptar(ID_INTERESADO, 1)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(solicitudesRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza si la solicitud no esta pendiente', async () => {
      const solicitud = {
        idSolicitud: 1,
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.ACEPTADA,
      } as SolicitudAdopcion;
      solicitudesRepository.findOne.mockResolvedValue(solicitud);

      await expect(service.aceptar(ID_DUENIO, 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rechaza si la solicitud no existe', async () => {
      solicitudesRepository.findOne.mockResolvedValue(null);

      await expect(service.aceptar(ID_DUENIO, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('rechazar', () => {
    it('rechaza una solicitud pendiente propia con motivo', async () => {
      const solicitud = {
        idSolicitud: 1,
        publicacion: publicacionActiva,
        solicitante: interesado,
        estado: SolicitudAdopcionEstado.PENDIENTE,
        motivoRechazo: null,
      } as SolicitudAdopcion;
      solicitudesRepository.findOne.mockResolvedValue(solicitud);
      solicitudesRepository.save.mockImplementation((s) => Promise.resolve(s));

      const dto: RechazarSolicitudAdopcionDto = {
        motivoRechazo: 'Ya se la entregamos a otra familia',
      };
      const result = await service.rechazar(ID_DUENIO, 1, dto);

      expect(result.estado).toBe(SolicitudAdopcionEstado.RECHAZADA);
      expect(result.motivoRechazo).toBe(dto.motivoRechazo);
    });
  });
});

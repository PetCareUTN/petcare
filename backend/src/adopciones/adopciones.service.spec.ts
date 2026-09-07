import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Not } from 'typeorm';
import { AdopcionStatus } from '../common/enums/adopcion-status.enum';
import { DescarteAdopcion } from '../descartes/entities/descarte-adopcion.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { SolicitudAdopcion } from '../solicitudes-adopcion/entities/solicitud-adopcion.entity';
import { User } from '../users/entities/user.entity';
import { AdopcionesService } from './adopciones.service';
import { CreatePublicacionAdopcionDto } from './dto/create-publicacion-adopcion.dto';
import { PublicacionAdopcion } from './entities/publicacion-adopcion.entity';

describe('AdopcionesService', () => {
  let service: AdopcionesService;
  let publicacionesRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };
  let usersRepository: {
    findOne: jest.Mock;
  };
  let solicitudesRepository: {
    find: jest.Mock;
  };
  let descartesRepository: {
    find: jest.Mock;
  };

  const ID_DUENIO = 7;
  const duenio = { idUsuario: ID_DUENIO, telefono: '+54 3511234567' } as User;

  const dto: CreatePublicacionAdopcionDto = {
    idMascota: 10,
    descripcion: 'Rocky es muy carinoso y busca un hogar con patio.',
  };

  const mascotaPropia = {
    idMascota: 10,
    nombre: 'Rocky',
    especie: 'Perro',
    raza: 'Labrador',
    sexo: 'macho',
    fechaNacimiento: '2023-03-10',
    esterilizado: true,
    foto: '/uploads/mascotas/rocky.jpg',
    usuarios: [duenio],
  } as Mascota;

  const publicacionBase = {
    idPublicacion: 1,
    mascota: mascotaPropia,
    usuario: duenio,
    descripcion: dto.descripcion,
    estado: AdopcionStatus.ACTIVA,
    tamano: null,
    vacunado: false,
    compatiblePerros: false,
    compatibleGatos: false,
    compatibleNinos: false,
    necesitaPatio: false,
    ubicacion: null,
    createdAt: new Date('2026-08-16T10:00:00Z'),
    updatedAt: new Date('2026-08-16T10:00:00Z'),
  } as PublicacionAdopcion;

  beforeEach(async () => {
    publicacionesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    mascotasRepository = {
      findOne: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
    };
    solicitudesRepository = {
      find: jest.fn().mockResolvedValue([]),
    };
    descartesRepository = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdopcionesService,
        {
          provide: getRepositoryToken(PublicacionAdopcion),
          useValue: publicacionesRepository,
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: mascotasRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: usersRepository,
        },
        {
          provide: getRepositoryToken(SolicitudAdopcion),
          useValue: solicitudesRepository,
        },
        {
          provide: getRepositoryToken(DescarteAdopcion),
          useValue: descartesRepository,
        },
      ],
    }).compile();

    service = module.get<AdopcionesService>(AdopcionesService);
  });

  it('publica una mascota propia y devuelve sus datos visibles', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
    publicacionesRepository.findOne.mockResolvedValue(null);
    usersRepository.findOne.mockResolvedValue(duenio);
    publicacionesRepository.create.mockReturnValue(publicacionBase);
    publicacionesRepository.save.mockResolvedValue(publicacionBase);

    const result = await service.publicar(ID_DUENIO, dto);

    expect(publicacionesRepository.create).toHaveBeenCalledWith({
      mascota: mascotaPropia,
      usuario: duenio,
      descripcion: dto.descripcion,
      estado: AdopcionStatus.ACTIVA,
      tamano: null,
      vacunado: false,
      compatiblePerros: false,
      compatibleGatos: false,
      compatibleNinos: false,
      necesitaPatio: false,
      ubicacion: null,
    });
    expect(result.idPublicacion).toBe(1);
    expect(result.descripcion).toBe(dto.descripcion);
    expect(result.mascota.nombre).toBe('Rocky');
    expect(result.mascota.esterilizado).toBe(true);
    expect(typeof result.mascota.edadAnios).toBe('number');
  });

  it('rechaza la publicacion si la mascota no existe', async () => {
    mascotasRepository.findOne.mockResolvedValue(null);

    await expect(service.publicar(ID_DUENIO, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(publicacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza la publicacion si la mascota es de otro dueno', async () => {
    const mascotaAjena = {
      ...mascotaPropia,
      usuarios: [{ idUsuario: 99 } as User],
    } as Mascota;
    mascotasRepository.findOne.mockResolvedValue(mascotaAjena);

    await expect(service.publicar(ID_DUENIO, dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(publicacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza la publicacion si la mascota ya tiene una publicacion activa', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
    publicacionesRepository.findOne.mockResolvedValue({
      idPublicacion: 5,
      estado: AdopcionStatus.ACTIVA,
    } as PublicacionAdopcion);

    await expect(service.publicar(ID_DUENIO, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(publicacionesRepository.findOne).toHaveBeenCalledWith({
      where: {
        mascota: { idMascota: dto.idMascota },
        estado: AdopcionStatus.ACTIVA,
      },
    });
    expect(publicacionesRepository.save).not.toHaveBeenCalled();
  });

  it('rechaza la publicacion si el usuario autenticado ya no existe', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
    publicacionesRepository.findOne.mockResolvedValue(null);
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.publicar(ID_DUENIO, dto)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(publicacionesRepository.save).not.toHaveBeenCalled();
  });

  it('no publica si el usuario no tiene telefono con codigo de pais', async () => {
    mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
    publicacionesRepository.findOne.mockResolvedValue(null);
    usersRepository.findOne.mockResolvedValue({
      ...duenio,
      telefono: '3511234567',
    });

    await expect(service.publicar(ID_DUENIO, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(publicacionesRepository.save).not.toHaveBeenCalled();
  });

  it('lista las publicaciones activas de otros usuarios, mas recientes primero', async () => {
    publicacionesRepository.find.mockResolvedValue([publicacionBase]);

    const OTRO_USUARIO = 99;
    const result = await service.findAll(OTRO_USUARIO);

    expect(publicacionesRepository.find).toHaveBeenCalledWith({
      where: {
        estado: AdopcionStatus.ACTIVA,
        usuario: { idUsuario: Not(OTRO_USUARIO) },
      },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].idPublicacion).toBe(1);
  });

  it('aplica filtros al listado (tamano, vacunado, especie, etc.)', async () => {
    publicacionesRepository.find.mockResolvedValue([]);

    await service.findAll(99, {
      tamano: 'GRANDE' as any,
      vacunado: true,
      especie: 'Perro',
      sexo: 'macho' as any,
    });

    expect(publicacionesRepository.find).toHaveBeenCalledWith({
      where: {
        estado: AdopcionStatus.ACTIVA,
        usuario: { idUsuario: Not(99) },
        tamano: 'GRANDE',
        vacunado: true,
        mascota: { especie: 'Perro', sexo: 'macho' },
      },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });
  });

  it('no publica una mascota sin foto', async () => {
    mascotasRepository.findOne.mockResolvedValue({
      ...mascotaPropia,
      foto: null,
    });

    await expect(service.publicar(ID_DUENIO, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(publicacionesRepository.save).not.toHaveBeenCalled();
  });

  it('excluye del listado las publicaciones que el usuario ya solicito', async () => {
    publicacionesRepository.find.mockResolvedValue([]);
    solicitudesRepository.find.mockResolvedValue([
      { publicacion: { idPublicacion: 4 } },
      { publicacion: { idPublicacion: 8 } },
    ]);

    await service.findAll(99);

    expect(solicitudesRepository.find).toHaveBeenCalledWith({
      where: { solicitante: { idUsuario: 99 } },
      relations: ['publicacion'],
    });
    expect(publicacionesRepository.find).toHaveBeenCalledWith({
      where: {
        estado: AdopcionStatus.ACTIVA,
        usuario: { idUsuario: Not(99) },
        idPublicacion: Not(In([4, 8])),
      },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });
  });

  it('excluye del listado las publicaciones que el usuario paso', async () => {
    publicacionesRepository.find.mockResolvedValue([]);
    solicitudesRepository.find.mockResolvedValue([
      { publicacion: { idPublicacion: 4 } },
    ]);
    descartesRepository.find.mockResolvedValue([
      { publicacion: { idPublicacion: 7 } },
    ]);

    await service.findAll(99);

    expect(descartesRepository.find).toHaveBeenCalledWith({
      where: { usuario: { idUsuario: 99 } },
      relations: ['publicacion'],
    });
    expect(publicacionesRepository.find).toHaveBeenCalledWith({
      where: {
        estado: AdopcionStatus.ACTIVA,
        usuario: { idUsuario: Not(99) },
        idPublicacion: Not(In([4, 7])),
      },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });
  });

  it('lista las publicaciones propias del usuario autenticado', async () => {
    publicacionesRepository.find.mockResolvedValue([publicacionBase]);

    const result = await service.findMisPublicaciones(ID_DUENIO);

    expect(publicacionesRepository.find).toHaveBeenCalledWith({
      where: { usuario: { idUsuario: ID_DUENIO } },
      relations: ['mascota'],
      order: { createdAt: 'DESC' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].idPublicacion).toBe(1);
  });

  it('devuelve el detalle de una publicacion activa', async () => {
    publicacionesRepository.findOne.mockResolvedValue(publicacionBase);

    const result = await service.findOne(1);

    expect(publicacionesRepository.findOne).toHaveBeenCalledWith({
      where: { idPublicacion: 1, estado: AdopcionStatus.ACTIVA },
      relations: ['mascota'],
    });
    expect(result.idPublicacion).toBe(1);
  });

  it('rechaza el detalle si la publicacion no existe o no esta activa', async () => {
    publicacionesRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('cancelar', () => {
    it('cancela una publicacion propia activa', async () => {
      const publicacion = { ...publicacionBase, estado: AdopcionStatus.ACTIVA };
      publicacionesRepository.findOne.mockResolvedValue(publicacion);
      publicacionesRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.cancelar(ID_DUENIO, 1);

      expect(result.estado).toBe(AdopcionStatus.CANCELADA);
    });

    it('rechaza cancelar una publicacion que no es propia o no existe', async () => {
      publicacionesRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelar(ID_DUENIO, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza cancelar una publicacion que no esta activa', async () => {
      const publicacion = { ...publicacionBase, estado: AdopcionStatus.CERRADA };
      publicacionesRepository.findOne.mockResolvedValue(publicacion);

      await expect(service.cancelar(ID_DUENIO, 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('pausar / reanudar', () => {
    it('pausa una publicacion propia activa', async () => {
      const publicacion = { ...publicacionBase, estado: AdopcionStatus.ACTIVA };
      publicacionesRepository.findOne.mockResolvedValue(publicacion);
      publicacionesRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.pausar(ID_DUENIO, 1);

      expect(result.estado).toBe(AdopcionStatus.PAUSADA);
    });

    it('rechaza pausar una publicacion que no esta activa', async () => {
      const publicacion = { ...publicacionBase, estado: AdopcionStatus.PAUSADA };
      publicacionesRepository.findOne.mockResolvedValue(publicacion);

      await expect(service.pausar(ID_DUENIO, 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reanuda una publicacion propia pausada', async () => {
      const publicacion = { ...publicacionBase, estado: AdopcionStatus.PAUSADA };
      publicacionesRepository.findOne.mockResolvedValue(publicacion);
      publicacionesRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.reanudar(ID_DUENIO, 1);

      expect(result.estado).toBe(AdopcionStatus.ACTIVA);
    });

    it('rechaza reanudar una publicacion que no esta pausada', async () => {
      const publicacion = { ...publicacionBase, estado: AdopcionStatus.ACTIVA };
      publicacionesRepository.findOne.mockResolvedValue(publicacion);

      await expect(service.reanudar(ID_DUENIO, 1)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});

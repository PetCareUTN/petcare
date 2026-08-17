import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdopcionStatus } from '../common/enums/adopcion-status.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
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
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };
  let usersRepository: {
    findOne: jest.Mock;
  };

  const ID_DUENIO = 7;
  const duenio = { idUsuario: ID_DUENIO } as User;

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
    foto: '/uploads/mascotas/rocky.jpg',
    usuarios: [duenio],
  } as Mascota;

  beforeEach(async () => {
    publicacionesRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    mascotasRepository = {
      findOne: jest.fn(),
    };
    usersRepository = {
      findOne: jest.fn(),
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
      ],
    }).compile();

    service = module.get<AdopcionesService>(AdopcionesService);
  });

  it('publica una mascota propia y devuelve sus datos visibles', async () => {
    const publicacion = {
      idPublicacion: 1,
      mascota: mascotaPropia,
      usuario: duenio,
      descripcion: dto.descripcion,
      estado: AdopcionStatus.ACTIVA,
      createdAt: new Date('2026-08-16T10:00:00Z'),
      updatedAt: new Date('2026-08-16T10:00:00Z'),
    } as PublicacionAdopcion;

    mascotasRepository.findOne.mockResolvedValue(mascotaPropia);
    publicacionesRepository.findOne.mockResolvedValue(null);
    usersRepository.findOne.mockResolvedValue(duenio);
    publicacionesRepository.create.mockReturnValue(publicacion);
    publicacionesRepository.save.mockResolvedValue(publicacion);

    const result = await service.publicar(ID_DUENIO, dto);

    expect(publicacionesRepository.create).toHaveBeenCalledWith({
      mascota: mascotaPropia,
      usuario: duenio,
      descripcion: dto.descripcion,
      estado: AdopcionStatus.ACTIVA,
    });
    expect(publicacionesRepository.save).toHaveBeenCalledWith(publicacion);
    expect(result).toEqual({
      idPublicacion: 1,
      estado: AdopcionStatus.ACTIVA,
      descripcion: dto.descripcion,
      createdAt: publicacion.createdAt,
      mascota: {
        idMascota: 10,
        nombre: 'Rocky',
        especie: 'Perro',
        raza: 'Labrador',
        sexo: 'macho',
        fechaNacimiento: '2023-03-10',
        foto: '/uploads/mascotas/rocky.jpg',
      },
    });
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
});

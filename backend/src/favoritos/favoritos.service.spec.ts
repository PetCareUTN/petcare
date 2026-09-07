import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { Favorito } from './entities/favorito.entity';
import { FavoritosService } from './favoritos.service';

describe('FavoritosService', () => {
  let service: FavoritosService;
  let favoritosRepository: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    remove: jest.Mock;
  };
  let publicacionesRepository: {
    findOne: jest.Mock;
  };

  const ID_USUARIO = 3;
  const publicacion = {
    idPublicacion: 5,
    mascota: { idMascota: 10, nombre: 'Rocky' },
  } as PublicacionAdopcion;

  beforeEach(async () => {
    favoritosRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };
    publicacionesRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritosService,
        {
          provide: getRepositoryToken(Favorito),
          useValue: favoritosRepository,
        },
        {
          provide: getRepositoryToken(PublicacionAdopcion),
          useValue: publicacionesRepository,
        },
      ],
    }).compile();

    service = module.get<FavoritosService>(FavoritosService);
  });

  describe('agregar', () => {
    it('agrega una publicacion a favoritos', async () => {
      publicacionesRepository.findOne.mockResolvedValue(publicacion);
      favoritosRepository.findOne.mockResolvedValue(null);
      const favorito = {
        idFavorito: 1,
        publicacion,
        createdAt: new Date('2026-08-16T10:00:00Z'),
      };
      favoritosRepository.create.mockReturnValue(favorito);
      favoritosRepository.save.mockResolvedValue(favorito);

      const result = await service.agregar(ID_USUARIO, { idPublicacion: 5 });

      expect(result.idFavorito).toBe(1);
      expect(result.publicacion.idPublicacion).toBe(5);
    });

    it('rechaza si la publicacion no existe', async () => {
      publicacionesRepository.findOne.mockResolvedValue(null);

      await expect(
        service.agregar(ID_USUARIO, { idPublicacion: 999 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('evita duplicados', async () => {
      publicacionesRepository.findOne.mockResolvedValue(publicacion);
      favoritosRepository.findOne.mockResolvedValue({ idFavorito: 1 });

      await expect(
        service.agregar(ID_USUARIO, { idPublicacion: 5 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(favoritosRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('quitar', () => {
    it('quita una publicacion de favoritos', async () => {
      const favorito = { idFavorito: 1, publicacion };
      favoritosRepository.findOne.mockResolvedValue(favorito);

      await service.quitar(ID_USUARIO, 5);

      expect(favoritosRepository.remove).toHaveBeenCalledWith(favorito);
    });

    it('rechaza si no estaba en favoritos', async () => {
      favoritosRepository.findOne.mockResolvedValue(null);

      await expect(service.quitar(ID_USUARIO, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listar', () => {
    it('lista los favoritos del usuario, mas recientes primero', async () => {
      const favorito = {
        idFavorito: 1,
        publicacion,
        createdAt: new Date('2026-08-16T10:00:00Z'),
      };
      favoritosRepository.find.mockResolvedValue([favorito]);

      const result = await service.listar(ID_USUARIO);

      expect(favoritosRepository.find).toHaveBeenCalledWith({
        where: { usuario: { idUsuario: ID_USUARIO } },
        relations: ['publicacion', 'publicacion.mascota'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });
});

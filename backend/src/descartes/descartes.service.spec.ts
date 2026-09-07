import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PublicacionAdopcion } from '../adopciones/entities/publicacion-adopcion.entity';
import { DescartesService } from './descartes.service';
import { DescarteAdopcion } from './entities/descarte-adopcion.entity';

describe('DescartesService', () => {
  let service: DescartesService;
  let descartesRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let publicacionesRepository: {
    findOne: jest.Mock;
  };

  const ID_USUARIO = 7;
  const publicacion = { idPublicacion: 3 } as PublicacionAdopcion;

  beforeEach(async () => {
    descartesRepository = {
      findOne: jest.fn(),
      create: jest.fn((datos) => datos),
      save: jest.fn((datos) => Promise.resolve(datos)),
      delete: jest.fn(),
    };
    publicacionesRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DescartesService,
        {
          provide: getRepositoryToken(DescarteAdopcion),
          useValue: descartesRepository,
        },
        {
          provide: getRepositoryToken(PublicacionAdopcion),
          useValue: publicacionesRepository,
        },
      ],
    }).compile();

    service = module.get<DescartesService>(DescartesService);
  });

  it('guarda el descarte de una publicacion existente', async () => {
    publicacionesRepository.findOne.mockResolvedValue(publicacion);
    descartesRepository.findOne.mockResolvedValue(null);

    await service.descartar(ID_USUARIO, { idPublicacion: 3 });

    expect(descartesRepository.save).toHaveBeenCalledWith({
      publicacion,
      usuario: { idUsuario: ID_USUARIO },
    });
  });

  it('no duplica el descarte si ya paso esa publicacion', async () => {
    publicacionesRepository.findOne.mockResolvedValue(publicacion);
    descartesRepository.findOne.mockResolvedValue({ idDescarte: 1 });

    await service.descartar(ID_USUARIO, { idPublicacion: 3 });

    expect(descartesRepository.save).not.toHaveBeenCalled();
  });

  it('falla si la publicacion no existe', async () => {
    publicacionesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.descartar(ID_USUARIO, { idPublicacion: 99 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(descartesRepository.save).not.toHaveBeenCalled();
  });

  it('limpia todos los descartes del usuario', async () => {
    await service.limpiar(ID_USUARIO);

    expect(descartesRepository.delete).toHaveBeenCalledWith({
      usuario: { idUsuario: ID_USUARIO },
    });
  });
});

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { TagBle } from './entities/tag-ble.entity';
import { TagsBleService } from './tags-ble.service';

describe('TagsBleService', () => {
  let service: TagsBleService;
  let tagsBleRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
  };

  const idDuenio = 151;
  const idMascota = 45;

  const mascota = {
    idMascota,
    nombre: 'Olivia',
    usuarios: [{ idUsuario: idDuenio }],
  } as Mascota;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsBleService,
        {
          provide: getRepositoryToken(TagBle),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TagsBleService>(TagsBleService);
    tagsBleRepository = module.get(getRepositoryToken(TagBle));
    mascotasRepository = module.get(getRepositoryToken(Mascota));
  });

  describe('vincular', () => {
    const dto = { tagId: 'C3BBDE4B02A1' };

    it('vincula un tag a una mascota propia', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      tagsBleRepository.findOne.mockResolvedValue(null);
      tagsBleRepository.create.mockReturnValue({ tagId: dto.tagId });
      tagsBleRepository.save.mockResolvedValue({
        idTagBle: 1,
        tagId: dto.tagId,
        mascota,
        createdAt: new Date('2026-09-18'),
      });

      const result = await service.vincular(idDuenio, idMascota, dto);

      expect(tagsBleRepository.create).toHaveBeenCalledWith({
        tagId: dto.tagId,
        mascota,
      });
      expect(result.tagId).toBe(dto.tagId);
      expect(result.idMascota).toBe(idMascota);
    });

    it('rechaza vincular una mascota de otro dueño', async () => {
      mascotasRepository.findOne.mockResolvedValue({
        ...mascota,
        usuarios: [{ idUsuario: 999 }],
      });

      await expect(
        service.vincular(idDuenio, idMascota, dto),
      ).rejects.toThrow(ForbiddenException);
      expect(tagsBleRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza vincular a una mascota inexistente', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(
        service.vincular(idDuenio, idMascota, dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza vincular cuando la mascota ya tiene un tag', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      tagsBleRepository.findOne.mockResolvedValueOnce({
        idTagBle: 2,
        tagId: 'AAAAAAAAAAAA',
      });

      await expect(
        service.vincular(idDuenio, idMascota, dto),
      ).rejects.toThrow(ConflictException);
      expect(tagsBleRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza vincular un tag que ya esta en uso por otra mascota', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      tagsBleRepository.findOne
        .mockResolvedValueOnce(null) // la mascota no tiene tag propio
        .mockResolvedValueOnce({ idTagBle: 3, tagId: dto.tagId }); // el tag ya esta en uso

      await expect(
        service.vincular(idDuenio, idMascota, dto),
      ).rejects.toThrow(ConflictException);
      expect(tagsBleRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('desvincular', () => {
    it('desvincula el tag de una mascota propia', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      const tagBle = { idTagBle: 1, tagId: 'C3BBDE4B02A1' };
      tagsBleRepository.findOne.mockResolvedValue(tagBle);

      await service.desvincular(idDuenio, idMascota);

      expect(tagsBleRepository.remove).toHaveBeenCalledWith(tagBle);
    });

    it('rechaza desvincular una mascota de otro dueño', async () => {
      mascotasRepository.findOne.mockResolvedValue({
        ...mascota,
        usuarios: [{ idUsuario: 999 }],
      });

      await expect(service.desvincular(idDuenio, idMascota)).rejects.toThrow(
        ForbiddenException,
      );
      expect(tagsBleRepository.remove).not.toHaveBeenCalled();
    });

    it('rechaza desvincular cuando no hay tag vinculado', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      tagsBleRepository.findOne.mockResolvedValue(null);

      await expect(service.desvincular(idDuenio, idMascota)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('obtenerPorMascota', () => {
    it('devuelve el tag vinculado', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      tagsBleRepository.findOne.mockResolvedValue({
        idTagBle: 1,
        tagId: 'C3BBDE4B02A1',
        mascota,
        createdAt: new Date('2026-09-18'),
      });

      const result = await service.obtenerPorMascota(idDuenio, idMascota);

      expect(result?.tagId).toBe('C3BBDE4B02A1');
    });

    it('devuelve null cuando la mascota no tiene tag vinculado', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota);
      tagsBleRepository.findOne.mockResolvedValue(null);

      const result = await service.obtenerPorMascota(idDuenio, idMascota);

      expect(result).toBeNull();
    });

    it('rechaza consultar el tag de una mascota de otro dueño', async () => {
      mascotasRepository.findOne.mockResolvedValue({
        ...mascota,
        usuarios: [{ idUsuario: 999 }],
      });

      await expect(
        service.obtenerPorMascota(idDuenio, idMascota),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

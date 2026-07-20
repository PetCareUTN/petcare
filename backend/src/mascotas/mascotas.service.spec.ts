import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PetSex } from '../common/enums/pet-sex.enum';
import { User } from '../users/entities/user.entity';
import { Mascota } from './entities/mascota.entity';
import { MascotasService } from './mascotas.service';
import { UpdateMascotaDto } from './dto/update-mascota.dto';

describe('MascotasService', () => {
  let service: MascotasService;
  let mascotasRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  const duenio = { idUsuario: 1 } as User;
  const otroUsuario = { idUsuario: 2 } as User;

  const buildMascota = (overrides: Partial<Mascota> = {}): Mascota =>
    ({
      idMascota: 10,
      nombre: 'Firulais',
      idHistoria: null,
      especie: 'Perro',
      raza: 'Labrador',
      sexo: PetSex.MACHO,
      fechaNacimiento: '2020-01-01',
      peso: '15.50',
      esterilizado: false,
      foto: null,
      observaciones: null,
      usuarios: [duenio],
      ...overrides,
    }) as Mascota;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MascotasService,
        {
          provide: getRepositoryToken(Mascota),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MascotasService>(MascotasService);
    mascotasRepository = module.get(getRepositoryToken(Mascota));
  });

  describe('findOne', () => {
    it('throws NotFoundException when the mascota does not exist', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999, duenio.idUsuario)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the user is not an owner', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());

      await expect(service.findOne(10, otroUsuario.idUsuario)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns the mascota when the user is an owner', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());

      const result = await service.findOne(10, duenio.idUsuario);

      expect(result.idMascota).toBe(10);
      expect(result.nombre).toBe('Firulais');
    });
  });

  describe('update', () => {
    it('throws NotFoundException when the mascota does not exist', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, duenio.idUsuario, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the user is not an owner', async () => {
      mascotasRepository.findOne.mockResolvedValue(buildMascota());

      await expect(
        service.update(10, otroUsuario.idUsuario, { nombre: 'Otro' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('applies only the provided fields and keeps the rest untouched', async () => {
      const mascota = buildMascota();
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateMascotaDto = {
        nombre: 'Firulais II',
        sexo: PetSex.HEMBRA,
      };

      const result = await service.update(10, duenio.idUsuario, dto);

      expect(mascotasRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          nombre: 'Firulais II',
          sexo: PetSex.HEMBRA,
          especie: 'Perro',
          raza: 'Labrador',
        }),
      );
      expect(result.nombre).toBe('Firulais II');
      expect(result.sexo).toBe(PetSex.HEMBRA);
      expect(result.especie).toBe('Perro');
    });

    it('allows correcting especie and sexo from an initial loading error', async () => {
      const mascota = buildMascota();
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      const dto: UpdateMascotaDto = { especie: 'Gato', sexo: PetSex.HEMBRA };

      const result = await service.update(10, duenio.idUsuario, dto);

      expect(result.especie).toBe('Gato');
      expect(result.sexo).toBe(PetSex.HEMBRA);
    });

    it('converts peso to the fixed-point string format used by the entity', async () => {
      const mascota = buildMascota();
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      await service.update(10, duenio.idUsuario, { peso: 12.3 });

      expect(mascotasRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ peso: '12.30' }),
      );
    });

    it('replaces the foto when a new file is uploaded', async () => {
      const mascota = buildMascota({ foto: '/uploads/mascotas/old.jpg' });
      mascotasRepository.findOne.mockResolvedValue(mascota);
      mascotasRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );
      jest
        .spyOn(
          service as unknown as { saveFoto: (f: unknown) => Promise<string> },
          'saveFoto',
        )
        .mockResolvedValue('/uploads/mascotas/new.jpg');

      const foto = {
        mimetype: 'image/png',
        originalname: 'new.png',
        buffer: Buffer.from(''),
      };
      const result = await service.update(10, duenio.idUsuario, {}, foto);

      expect(result.foto).toBe('/uploads/mascotas/new.jpg');
    });
  });
});

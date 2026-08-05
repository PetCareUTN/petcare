import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ClinicalEventType } from '../common/enums/clinical-event-type.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { HistoriaClinica } from '../historias-clinicas/entities/historia-clinica.entity';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { CreateEventoClinicoDto } from './dto/create-evento-clinico.dto';
import { ArchivoMedico } from './entities/archivo-medico.entity';
import { EventoClinico } from './entities/evento-clinico.entity';
import { EventosClinicosService } from './eventos-clinicos.service';
import type { UploadedMedicalFile } from './types/uploaded-medical-file.type';

describe('EventosClinicosService', () => {
  let service: EventosClinicosService;
  let eventosClinicosRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let archivosMedicosRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let historiasClinicasRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let mascotasRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let veterinariosRepository: {
    findOne: jest.Mock;
  };

  const veterinario = {
    idVeterinario: 4,
    estadoValidacion: ValidationStatus.APROBADO,
  } as Veterinario;

  const dto: CreateEventoClinicoDto = {
    idMascota: 10,
    tipo: ClinicalEventType.DIAGNOSTICO,
    fecha: '2026-07-31',
    descripcion: 'Consulta por tos persistente',
    diagnostico: 'Bronquitis leve',
    tratamiento: 'Reposo y control',
  };

  beforeEach(async () => {
    eventosClinicosRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    archivosMedicosRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    historiasClinicasRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    mascotasRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    veterinariosRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventosClinicosService,
        {
          provide: getRepositoryToken(EventoClinico),
          useValue: eventosClinicosRepository,
        },
        {
          provide: getRepositoryToken(ArchivoMedico),
          useValue: archivosMedicosRepository,
        },
        {
          provide: getRepositoryToken(HistoriaClinica),
          useValue: historiasClinicasRepository,
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: mascotasRepository,
        },
        {
          provide: getRepositoryToken(Veterinario),
          useValue: veterinariosRepository,
        },
      ],
    }).compile();

    service = module.get<EventosClinicosService>(EventosClinicosService);
  });

  it('registra un evento clinico en la historia existente de la mascota', async () => {
    const historia = { idHistoria: 20 } as HistoriaClinica;
    const mascota = {
      idMascota: 10,
      idHistoria: 20,
      historiaClinica: historia,
    } as Mascota;
    const evento = {
      idEvento: 30,
      historia,
      veterinario,
      tipo: dto.tipo,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      diagnostico: dto.diagnostico,
      tratamiento: dto.tratamiento,
      observaciones: null,
      createdAt: new Date('2026-07-31T10:00:00Z'),
      updatedAt: new Date('2026-07-31T10:00:00Z'),
    } as EventoClinico;

    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    mascotasRepository.findOne.mockResolvedValue(mascota);
    eventosClinicosRepository.create.mockReturnValue(evento);
    eventosClinicosRepository.save.mockResolvedValue(evento);

    const result = await service.create(7, dto);

    expect(veterinariosRepository.findOne).toHaveBeenCalledWith({
      where: { usuario: { idUsuario: 7 } },
    });
    expect(mascotasRepository.findOne).toHaveBeenCalledWith({
      where: { idMascota: 10 },
      relations: ['historiaClinica', 'usuarios'],
    });
    expect(historiasClinicasRepository.save).not.toHaveBeenCalled();
    expect(eventosClinicosRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        historia,
        veterinario,
        tipo: ClinicalEventType.DIAGNOSTICO,
        descripcion: 'Consulta por tos persistente',
        observaciones: null,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        idEvento: 30,
        idHistoria: 20,
        idMascota: 10,
        idVeterinario: 4,
        tipo: ClinicalEventType.DIAGNOSTICO,
      }),
    );
  });

  it('crea la historia clinica cuando la mascota todavia no tiene una', async () => {
    const mascota = {
      idMascota: 10,
      idHistoria: null,
      historiaClinica: null,
    } as Mascota;
    const historia = { idHistoria: 21 } as HistoriaClinica;
    const evento = {
      idEvento: 31,
      historia,
      veterinario,
      tipo: dto.tipo,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      diagnostico: null,
      tratamiento: null,
      observaciones: null,
      createdAt: new Date('2026-07-31T10:00:00Z'),
      updatedAt: new Date('2026-07-31T10:00:00Z'),
    } as EventoClinico;

    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    mascotasRepository.findOne.mockResolvedValue(mascota);
    historiasClinicasRepository.create.mockReturnValue(historia);
    historiasClinicasRepository.save.mockResolvedValue(historia);
    mascotasRepository.save.mockResolvedValue({
      ...mascota,
      idHistoria: historia.idHistoria,
      historiaClinica: historia,
    });
    eventosClinicosRepository.create.mockReturnValue(evento);
    eventosClinicosRepository.save.mockResolvedValue(evento);

    const result = await service.create(7, {
      ...dto,
      diagnostico: undefined,
      tratamiento: undefined,
    });

    expect(historiasClinicasRepository.create).toHaveBeenCalledWith();
    expect(mascota.idHistoria).toBe(21);
    expect(mascotasRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        idMascota: 10,
        idHistoria: 21,
        historiaClinica: historia,
      }),
    );
    expect(result.idHistoria).toBe(21);
  });

  it('rechaza el registro cuando no existe veterinario aprobado para el usuario', async () => {
    veterinariosRepository.findOne.mockResolvedValue({
      idVeterinario: 4,
      estadoValidacion: ValidationStatus.PENDIENTE,
    });

    await expect(service.create(7, dto)).rejects.toThrow(ForbiddenException);
    expect(mascotasRepository.findOne).not.toHaveBeenCalled();
  });

  it('rechaza el registro cuando la mascota no existe', async () => {
    veterinariosRepository.findOne.mockResolvedValue(veterinario);
    mascotasRepository.findOne.mockResolvedValue(null);

    await expect(service.create(7, dto)).rejects.toThrow(NotFoundException);
    expect(eventosClinicosRepository.save).not.toHaveBeenCalled();
  });

  describe('findHistoriaClinicaByMascota', () => {
    const historia = { idHistoria: 20, fechaCreacion: new Date('2026-07-01') };
    const eventoGuardado = {
      idEvento: 30,
      historia: { ...historia, mascota: { idMascota: 10 } },
      veterinario,
      tipo: ClinicalEventType.DIAGNOSTICO,
      fecha: '2026-07-31',
      descripcion: 'Consulta por tos persistente',
      diagnostico: null,
      tratamiento: null,
      observaciones: null,
      createdAt: new Date('2026-07-31T10:00:00Z'),
      updatedAt: new Date('2026-07-31T10:00:00Z'),
    } as EventoClinico;

    const duenio = { idUsuario: 7 };

    it('el dueño consulta la historia clinica de su propia mascota', async () => {
      const mascota = {
        idMascota: 10,
        usuarios: [duenio],
        historiaClinica: historia,
      } as unknown as Mascota;
      const requester: JwtPayload = {
        sub: 7,
        email: 'sofia@petcare.com',
        idRol: 1,
        rol: RoleName.DUENO_MASCOTA,
      };

      mascotasRepository.findOne.mockResolvedValue(mascota);
      eventosClinicosRepository.find.mockResolvedValue([eventoGuardado]);

      const result = await service.findHistoriaClinicaByMascota(10, requester);

      expect(eventosClinicosRepository.find).toHaveBeenCalledWith({
        where: { historia: { idHistoria: 20 } },
        relations: [
          'historia',
          'historia.mascota',
          'veterinario',
          'archivosMedicos',
        ],
        order: { fecha: 'ASC' },
      });
      expect(result.idHistoria).toBe(20);
      expect(result.eventos).toHaveLength(1);
    });

    it('el veterinario consulta la historia de una mascota que ya es su paciente', async () => {
      const mascota = {
        idMascota: 10,
        usuarios: [duenio],
        historiaClinica: historia,
      } as unknown as Mascota;
      const requester: JwtPayload = {
        sub: 4,
        email: 'vet@petcare.com',
        idRol: 2,
        rol: RoleName.VETERINARIO,
      };

      mascotasRepository.findOne.mockResolvedValue(mascota);
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      eventosClinicosRepository.findOne.mockResolvedValue(eventoGuardado);
      eventosClinicosRepository.find.mockResolvedValue([eventoGuardado]);

      const result = await service.findHistoriaClinicaByMascota(10, requester);

      expect(eventosClinicosRepository.findOne).toHaveBeenCalledWith({
        where: {
          historia: { idHistoria: 20 },
          veterinario: { idVeterinario: 4 },
        },
      });
      expect(result.eventos).toHaveLength(1);
    });

    it('rechaza al veterinario que nunca atendio a esa mascota', async () => {
      const mascota = {
        idMascota: 10,
        usuarios: [duenio],
        historiaClinica: historia,
      } as unknown as Mascota;
      const requester: JwtPayload = {
        sub: 4,
        email: 'vet@petcare.com',
        idRol: 2,
        rol: RoleName.VETERINARIO,
      };

      mascotasRepository.findOne.mockResolvedValue(mascota);
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      eventosClinicosRepository.findOne.mockResolvedValue(null);

      await expect(
        service.findHistoriaClinicaByMascota(10, requester),
      ).rejects.toThrow(ForbiddenException);
      expect(eventosClinicosRepository.find).not.toHaveBeenCalled();
    });

    it('rechaza a un usuario que no es dueño ni veterinario de la mascota', async () => {
      const mascota = {
        idMascota: 10,
        usuarios: [duenio],
        historiaClinica: historia,
      } as unknown as Mascota;
      const requester: JwtPayload = {
        sub: 99,
        email: 'otro@petcare.com',
        idRol: 1,
        rol: RoleName.DUENO_MASCOTA,
      };

      mascotasRepository.findOne.mockResolvedValue(mascota);

      await expect(
        service.findHistoriaClinicaByMascota(10, requester),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devuelve historia vacia cuando la mascota todavia no tiene eventos', async () => {
      const mascota = {
        idMascota: 10,
        usuarios: [duenio],
        historiaClinica: null,
      } as unknown as Mascota;
      const requester: JwtPayload = {
        sub: 7,
        email: 'sofia@petcare.com',
        idRol: 1,
        rol: RoleName.DUENO_MASCOTA,
      };

      mascotasRepository.findOne.mockResolvedValue(mascota);

      const result = await service.findHistoriaClinicaByMascota(10, requester);

      expect(result).toEqual({
        idHistoria: null,
        idMascota: 10,
        fechaCreacion: null,
        eventos: [],
      });
      expect(eventosClinicosRepository.find).not.toHaveBeenCalled();
    });

    it('rechaza la consulta cuando la mascota no existe', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);
      const requester: JwtPayload = {
        sub: 7,
        email: 'sofia@petcare.com',
        idRol: 1,
        rol: RoleName.DUENO_MASCOTA,
      };

      await expect(
        service.findHistoriaClinicaByMascota(999, requester),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('agregarArchivos', () => {
    const historia = { idHistoria: 20 } as HistoriaClinica;
    const eventoGuardado = {
      idEvento: 30,
      historia,
      veterinario,
    } as EventoClinico;

    const archivo: UploadedMedicalFile = {
      filename: 'a1b2c3.pdf',
      originalname: 'analisis-sangre.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    };

    it('adjunta archivos cuando el veterinario es el autor del evento', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      eventosClinicosRepository.findOne.mockResolvedValue(eventoGuardado);
      archivosMedicosRepository.create.mockImplementation(
        (data: Partial<ArchivoMedico>) => data,
      );
      archivosMedicosRepository.save.mockResolvedValue([
        {
          idArchivo: 1,
          nombreOriginal: archivo.originalname,
          nombreArchivo: archivo.filename,
          mimeType: archivo.mimetype,
          tamanoBytes: archivo.size,
          createdAt: new Date('2026-08-01T10:00:00Z'),
        },
      ]);

      const result = await service.agregarArchivos(30, 7, [archivo]);

      expect(eventosClinicosRepository.findOne).toHaveBeenCalledWith({
        where: { idEvento: 30 },
        relations: ['historia', 'veterinario'],
      });
      expect(archivosMedicosRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          evento: eventoGuardado,
          nombreOriginal: archivo.originalname,
          nombreArchivo: archivo.filename,
          mimeType: archivo.mimetype,
          tamanoBytes: archivo.size,
        }),
      );
      expect(result).toEqual([
        expect.objectContaining({
          idArchivo: 1,
          idEvento: 30,
          nombreOriginal: archivo.originalname,
          url: '/uploads/eventos-clinicos/a1b2c3.pdf',
        }),
      ]);
    });

    it('adjunta archivos cuando otro veterinario ya es paciente de esa historia', async () => {
      const otroVeterinario = {
        idVeterinario: 9,
        estadoValidacion: ValidationStatus.APROBADO,
      } as Veterinario;

      veterinariosRepository.findOne.mockResolvedValue(otroVeterinario);
      eventosClinicosRepository.findOne
        .mockResolvedValueOnce(eventoGuardado)
        .mockResolvedValueOnce(eventoGuardado);
      archivosMedicosRepository.create.mockImplementation(
        (data: Partial<ArchivoMedico>) => data,
      );
      archivosMedicosRepository.save.mockResolvedValue([
        {
          idArchivo: 2,
          nombreOriginal: archivo.originalname,
          nombreArchivo: archivo.filename,
          mimeType: archivo.mimetype,
          tamanoBytes: archivo.size,
          createdAt: new Date('2026-08-01T10:00:00Z'),
        },
      ]);

      const result = await service.agregarArchivos(30, 15, [archivo]);

      expect(eventosClinicosRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: {
          historia: { idHistoria: 20 },
          veterinario: { idVeterinario: 9 },
        },
      });
      expect(result).toHaveLength(1);
    });

    it('rechaza a un veterinario que no atendio esa historia ni es el autor', async () => {
      const otroVeterinario = {
        idVeterinario: 9,
        estadoValidacion: ValidationStatus.APROBADO,
      } as Veterinario;

      veterinariosRepository.findOne.mockResolvedValue(otroVeterinario);
      eventosClinicosRepository.findOne
        .mockResolvedValueOnce(eventoGuardado)
        .mockResolvedValueOnce(null);

      await expect(service.agregarArchivos(30, 15, [archivo])).rejects.toThrow(
        ForbiddenException,
      );
      expect(archivosMedicosRepository.save).not.toHaveBeenCalled();
    });

    it('rechaza cuando el evento clinico no existe', async () => {
      veterinariosRepository.findOne.mockResolvedValue(veterinario);
      eventosClinicosRepository.findOne.mockResolvedValue(null);

      await expect(service.agregarArchivos(999, 7, [archivo])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rechaza cuando no se envio ningun archivo', async () => {
      await expect(service.agregarArchivos(30, 7, [])).rejects.toThrow(
        BadRequestException,
      );
      expect(veterinariosRepository.findOne).not.toHaveBeenCalled();
    });

    it('rechaza cuando el usuario no es un veterinario validado', async () => {
      veterinariosRepository.findOne.mockResolvedValue(null);

      await expect(service.agregarArchivos(30, 7, [archivo])).rejects.toThrow(
        ForbiddenException,
      );
      expect(eventosClinicosRepository.findOne).not.toHaveBeenCalled();
    });
  });
});

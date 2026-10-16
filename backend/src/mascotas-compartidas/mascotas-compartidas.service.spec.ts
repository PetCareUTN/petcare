import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { SolicitudCompartirMascotaEstado } from '../common/enums/solicitud-compartir-mascota-estado.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { User } from '../users/entities/user.entity';
import { SolicitudCompartirMascota } from './entities/solicitud-compartir-mascota.entity';
import { MascotasCompartidasService } from './mascotas-compartidas.service';

describe('MascotasCompartidasService', () => {
  let service: MascotasCompartidasService;
  let solicitudesRepository: {
    findOne: jest.Mock;
    find: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  };
  let mascotasRepository: { findOne: jest.Mock; query: jest.Mock };
  let usersRepository: { findOne: jest.Mock; findOneOrFail: jest.Mock };
  let manager: { update: jest.Mock; query: jest.Mock };
  let notificacionesService: { crear: jest.Mock };

  const ID_MASCOTA = 10;
  const ID_A = 1; // quien registró la mascota
  const ID_B = 2;
  const ID_C = 3;

  const usuarioA = { idUsuario: ID_A, nombre: 'Ana', apellido: 'Lopez' };
  const usuarioB = {
    idUsuario: ID_B,
    nombre: 'Marta',
    apellido: 'Gomez',
    email: 'marta@example.com',
    numeroDocumento: '30123456',
    rol: { nombre: RoleName.DUENO_MASCOTA },
  };

  const mascota = (overrides: Record<string, unknown> = {}) => ({
    idMascota: ID_MASCOTA,
    nombre: 'Rocky',
    especie: 'Perro',
    foto: null,
    idDuenioPrincipal: ID_A,
    usuarios: [usuarioA],
    ...overrides,
  });

  const fila = (idUsuario: number, dia: number) => ({
    id_usuario: idUsuario,
    created_at: new Date(2026, 9, dia),
  });

  const solicitudPendiente = () => ({
    idSolicitud: 5,
    estado: SolicitudCompartirMascotaEstado.PENDIENTE,
    createdAt: new Date(2026, 9, 15),
    mascota: mascota(),
    origen: usuarioA,
    destino: usuarioB,
  });

  beforeEach(async () => {
    manager = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      query: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MascotasCompartidasService,
        {
          provide: getRepositoryToken(SolicitudCompartirMascota),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn().mockResolvedValue([]),
            save: jest.fn(),
            create: jest.fn((datos: object) => datos),
          },
        },
        {
          provide: getRepositoryToken(Mascota),
          useValue: { findOne: jest.fn(), query: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: { findOne: jest.fn(), findOneOrFail: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            manager,
            transaction: jest.fn((callback: (m: unknown) => unknown) =>
              callback(manager),
            ),
          },
        },
        {
          provide: NotificacionesService,
          useValue: { crear: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get(MascotasCompartidasService);
    solicitudesRepository = module.get(
      getRepositoryToken(SolicitudCompartirMascota),
    );
    mascotasRepository = module.get(getRepositoryToken(Mascota));
    usersRepository = module.get(getRepositoryToken(User));
    notificacionesService = module.get(NotificacionesService);
  });

  describe('buscarUsuario', () => {
    it('devuelve solo el nombre parcial de la persona encontrada por email', async () => {
      usersRepository.findOne.mockResolvedValue(usuarioB);

      const resultado = await service.buscarUsuario(
        ID_A,
        ' Marta@Example.com ',
      );

      expect(resultado).toEqual({ idUsuario: ID_B, nombreParcial: 'Marta G.' });
      expect(resultado).not.toHaveProperty('email');
      expect(resultado).not.toHaveProperty('numeroDocumento');
    });

    it('busca por DNI cuando se indica', async () => {
      usersRepository.findOne.mockResolvedValue(usuarioB);

      await service.buscarUsuario(ID_A, undefined, ' 30123456 ');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { numeroDocumento: '30123456' },
      });
    });

    it('rechaza si no se indica ni email ni DNI', async () => {
      await expect(service.buscarUsuario(ID_A)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('responde que no lo encontró cuando no existe', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.buscarUsuario(ID_A, 'nadie@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('responde lo mismo si la persona no es dueña de mascotas', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...usuarioB,
        rol: { nombre: RoleName.VETERINARIO },
      });

      await expect(
        service.buscarUsuario(ID_A, 'marta@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('no deja compartir con uno mismo', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...usuarioB,
        idUsuario: ID_A,
      });

      await expect(
        service.buscarUsuario(ID_A, 'ana@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('solicitar', () => {
    beforeEach(() => {
      mascotasRepository.findOne.mockResolvedValue(mascota());
      mascotasRepository.query.mockResolvedValue([fila(ID_A, 1)]);
      usersRepository.findOne.mockResolvedValue(usuarioB);
      usersRepository.findOneOrFail.mockResolvedValue(usuarioA);
      solicitudesRepository.findOne.mockResolvedValue(null);
      solicitudesRepository.save.mockImplementation((s: object) => ({
        idSolicitud: 5,
        createdAt: new Date(),
        ...s,
      }));
    });

    it('crea la solicitud pendiente y avisa a la otra persona', async () => {
      const resultado = await service.solicitar(ID_A, {
        idMascota: ID_MASCOTA,
        idUsuarioDestino: ID_B,
      });

      expect(resultado.estado).toBe(SolicitudCompartirMascotaEstado.PENDIENTE);
      expect(resultado.idUsuarioDestino).toBe(ID_B);
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_B,
        NotificationType.SOLICITUD_COMPARTIR_MASCOTA,
        expect.any(String),
        expect.stringContaining('Rocky'),
        5,
      );
    });

    it('no deja compartir a quien no es el dueño principal', async () => {
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_C, 2),
      ]);

      await expect(
        service.solicitar(ID_C, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(solicitudesRepository.save).not.toHaveBeenCalled();
    });

    it('no deja compartir a alguien que no es dueño de la mascota', async () => {
      await expect(
        service.solicitar(99, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('responde 404 si la mascota no existe', async () => {
      mascotasRepository.findOne.mockResolvedValue(null);

      await expect(
        service.solicitar(ID_A, { idMascota: 999, idUsuarioDestino: ID_B }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza compartir con uno mismo', async () => {
      await expect(
        service.solicitar(ID_A, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_A,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza si la persona ya es dueña de la mascota', async () => {
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_B, 2),
      ]);

      await expect(
        service.solicitar(ID_A, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si ya hay una solicitud pendiente para esa persona', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());

      await expect(
        service.solicitar(ID_A, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('traduce la violación del índice único a 409 cuando llegan dos pedidos a la vez', async () => {
      solicitudesRepository.save.mockRejectedValue({
        driverError: { code: '23505' },
      });

      await expect(
        service.solicitar(ID_A, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).rejects.toThrow(ConflictException);
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });

    it('no deja compartir con alguien que no es dueño de mascotas', async () => {
      usersRepository.findOne.mockResolvedValue({
        ...usuarioB,
        rol: { nombre: RoleName.VETERINARIO },
      });

      await expect(
        service.solicitar(ID_A, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('trata como principal al dueño más antiguo si la mascota no lo tiene cargado', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        mascota({ idDuenioPrincipal: null }),
      );

      await expect(
        service.solicitar(ID_A, {
          idMascota: ID_MASCOTA,
          idUsuarioDestino: ID_B,
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('aceptar', () => {
    it('suma a la persona como dueña y avisa a quien compartió', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());

      const resultado = await service.aceptar(5, ID_B);

      expect(resultado.estado).toBe(SolicitudCompartirMascotaEstado.ACEPTADA);
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO "usuarios_mascotas"'),
        [ID_B, ID_MASCOTA],
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_A,
        NotificationType.COMPARTIR_MASCOTA_ACEPTADA,
        expect.any(String),
        expect.stringContaining('Rocky'),
        ID_MASCOTA,
      );
    });

    it('responde 404 si la solicitud es de otra persona', async () => {
      solicitudesRepository.findOne.mockResolvedValue(null);

      await expect(service.aceptar(5, 99)).rejects.toThrow(NotFoundException);
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('responde 409 y no suma a nadie si la solicitud ya no estaba pendiente', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());
      manager.update.mockResolvedValue({ affected: 0 });

      await expect(service.aceptar(5, ID_B)).rejects.toThrow(ConflictException);
      expect(manager.query).not.toHaveBeenCalled();
      expect(notificacionesService.crear).not.toHaveBeenCalled();
    });
  });

  describe('rechazar', () => {
    it('marca la solicitud como rechazada y avisa a quien compartió', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());

      const resultado = await service.rechazar(5, ID_B);

      expect(resultado.estado).toBe(SolicitudCompartirMascotaEstado.RECHAZADA);
      expect(manager.query).not.toHaveBeenCalled();
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_A,
        NotificationType.COMPARTIR_MASCOTA_RECHAZADA,
        expect.any(String),
        expect.any(String),
        ID_MASCOTA,
      );
    });

    it('responde 409 si ya había sido respondida', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());
      manager.update.mockResolvedValue({ affected: 0 });

      await expect(service.rechazar(5, ID_B)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('cancelar', () => {
    it('deja cancelar a quien la envió mientras esté pendiente', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());

      const resultado = await service.cancelar(5, ID_A);

      expect(resultado.estado).toBe(SolicitudCompartirMascotaEstado.CANCELADA);
    });

    it('responde 404 si la solicitud no la envió quien intenta cancelarla', async () => {
      solicitudesRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelar(5, ID_B)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('responde 409 si ya la habían aceptado', async () => {
      solicitudesRepository.findOne.mockResolvedValue(solicitudPendiente());
      manager.update.mockResolvedValue({ affected: 0 });

      await expect(service.cancelar(5, ID_A)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('listarDuenios', () => {
    it('marca al principal y respeta el orden en que se sumaron', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        mascota({ usuarios: [usuarioA, usuarioB] }),
      );
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_B, 2),
      ]);

      const duenios = await service.listarDuenios(ID_B, ID_MASCOTA);

      expect(duenios.map((d) => [d.idUsuario, d.esPrincipal])).toEqual([
        [ID_A, true],
        [ID_B, false],
      ]);
      expect(duenios[1].nombre).toBe('Marta Gomez');
    });

    it('no deja verlos a quien no es dueño', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota());
      mascotasRepository.query.mockResolvedValue([fila(ID_A, 1)]);

      await expect(service.listarDuenios(99, ID_MASCOTA)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('quitarDuenio', () => {
    beforeEach(() => {
      mascotasRepository.findOne.mockResolvedValue(
        mascota({ usuarios: [usuarioA, usuarioB] }),
      );
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_B, 2),
      ]);
    });

    it('el principal puede quitar a otro dueño y este recibe un aviso', async () => {
      await service.quitarDuenio(ID_A, ID_MASCOTA, ID_B);

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "usuarios_mascotas"'),
        [ID_MASCOTA, ID_B],
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_B,
        NotificationType.COMPARTIR_MASCOTA_BAJA,
        expect.any(String),
        expect.any(String),
        ID_MASCOTA,
      );
    });

    it('quien aceptó no puede quitar a otros dueños', async () => {
      await expect(
        service.quitarDuenio(ID_B, ID_MASCOTA, ID_A),
      ).rejects.toThrow(ForbiddenException);
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('el principal no se quita a sí mismo por esta vía', async () => {
      await expect(
        service.quitarDuenio(ID_A, ID_MASCOTA, ID_A),
      ).rejects.toThrow(BadRequestException);
    });

    it('responde 404 si la persona no era dueña', async () => {
      await expect(
        service.quitarDuenio(ID_A, ID_MASCOTA, ID_C),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('salir', () => {
    it('quien aceptó puede dejar de ver la mascota sin cambiar el principal', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        mascota({ usuarios: [usuarioA, usuarioB] }),
      );
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_B, 2),
      ]);

      await service.salir(ID_B, ID_MASCOTA);

      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM "usuarios_mascotas"'),
        [ID_MASCOTA, ID_B],
      );
      expect(manager.update).not.toHaveBeenCalled();
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_A,
        NotificationType.COMPARTIR_MASCOTA_BAJA,
        expect.any(String),
        expect.any(String),
        ID_MASCOTA,
      );
    });

    it('si se va el principal, hereda el dueño que se sumó primero', async () => {
      const usuarioC = { idUsuario: ID_C, nombre: 'Carlos', apellido: 'Paz' };
      mascotasRepository.findOne.mockResolvedValue(
        mascota({ usuarios: [usuarioA, usuarioB, usuarioC] }),
      );
      // B se sumó antes que C, aunque C tenga menor id.
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_B, 2),
        fila(ID_C, 3),
      ]);

      await service.salir(ID_A, ID_MASCOTA);

      expect(manager.update).toHaveBeenCalledWith(
        Mascota,
        { idMascota: ID_MASCOTA },
        { idDuenioPrincipal: ID_B },
      );
      expect(notificacionesService.crear).toHaveBeenCalledWith(
        ID_B,
        NotificationType.COMPARTIR_MASCOTA_BAJA,
        expect.stringContaining('principal'),
        expect.any(String),
        ID_MASCOTA,
      );
    });

    it('al irse el principal se cancelan sus solicitudes pendientes', async () => {
      mascotasRepository.findOne.mockResolvedValue(
        mascota({ usuarios: [usuarioA, usuarioB] }),
      );
      mascotasRepository.query.mockResolvedValue([
        fila(ID_A, 1),
        fila(ID_B, 2),
      ]);

      await service.salir(ID_A, ID_MASCOTA);

      expect(manager.update).toHaveBeenCalledWith(
        SolicitudCompartirMascota,
        expect.objectContaining({
          estado: SolicitudCompartirMascotaEstado.PENDIENTE,
        }),
        { estado: SolicitudCompartirMascotaEstado.CANCELADA },
      );
    });

    it('el único dueño no puede dejar la mascota', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota());
      mascotasRepository.query.mockResolvedValue([fila(ID_A, 1)]);

      await expect(service.salir(ID_A, ID_MASCOTA)).rejects.toThrow(
        ConflictException,
      );
      expect(manager.query).not.toHaveBeenCalled();
    });

    it('quien no es dueño no puede salir', async () => {
      mascotasRepository.findOne.mockResolvedValue(mascota());
      mascotasRepository.query.mockResolvedValue([fila(ID_A, 1)]);

      await expect(service.salir(99, ID_MASCOTA)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

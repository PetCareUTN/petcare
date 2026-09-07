import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { SolicitudPrestador } from './entities/solicitud-prestador.entity';
import { PrestadoresController } from './prestadores.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { TurnoServicioEstado } from '../common/enums/turno-servicio-estado.enum';
import { mimeDocumento, PrestadoresService } from './prestadores.service';
import { RevisarPrestadorDto, SolicitarPrestadorDto } from './prestadores.dto';
import { GeocodingService } from '../geocoding/geocoding.service';

describe('PrestadoresService: confianza y autorización', () => {
  const ahora = new Date('2026-09-05T15:00:00Z');
  const solicitud = () => ({
    id: 1,
    idUsuario: 20,
    categoria: CategoriaServicio.PASEADOR,
    estado: 'pendiente',
    actualizada: ahora,
    datos: { referencias: 'Referencia autorizada' },
    historial: [],
  });
  const revision = (): RevisarPrestadorDto => ({
    estado: 'aprobado',
    motivo: 'Identidad cotejada por videollamada y contacto comprobado.',
    identidadRevisada: true,
    contactoVerificado: true,
    condicionesRevisadas: true,
    referenciasComprobadas: false,
    version: ahora.toISOString(),
  });
  const dto: SolicitarPrestadorDto = {
    categoria: CategoriaServicio.PASEADOR,
    nombreCompleto: 'Prestador Prueba',
    numeroDocumento: '12345678',
    telefono: '1234567890',
    experiencia: 'Experiencia suficiente con mascotas de diferentes edades.',
    protocolo:
      'Uso correas y reviso cierres; ante emergencias contacto al dueño y a su veterinario.',
    direccion: 'Zona de prueba, barrio ficticio',
    consentimiento: 'true',
  };
  const archivo = {
    fieldname: 'identidad',
    buffer: Buffer.from('%PDF-1.7 ejemplo'),
  } as Express.Multer.File;
  const repo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  };
  const em = {
    getRepository: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    existsBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  };
  const db = { getRepository: jest.fn(), transaction: jest.fn() };
  const geocoding = { geocodificar: jest.fn() };
  let service: PrestadoresService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(ahora);
    for (const fn of [
      ...Object.values(repo),
      ...Object.values(em),
      ...Object.values(db),
      ...Object.values(geocoding),
    ])
      fn.mockReset();
    db.getRepository.mockReturnValue(repo);
    db.transaction.mockImplementation(
      (fn: (manager: typeof em) => Promise<unknown>) => fn(em),
    );
    em.getRepository.mockReturnValue(repo);
    em.create.mockImplementation((_entity: unknown, values: unknown) => values);
    em.save.mockImplementation((value: unknown) => Promise.resolve(value));
    geocoding.geocodificar.mockResolvedValue(null);
    service = new PrestadoresService(
      db as unknown as DataSource,
      geocoding as unknown as GeocodingService,
    );
  });
  afterEach(() => jest.useRealTimers());

  it('rechaza archivos HTML aunque el cliente declare un MIME permitido', () => {
    expect(() => mimeDocumento(Buffer.from('<html>falso.pdf</html>'))).toThrow(
      BadRequestException,
    );
  });
  it.each(['pendiente', 'correccion', 'rechazado', 'suspendido'])(
    'bloquea una categoría no aprobada (%s)',
    async () => {
      repo.findOneBy
        .mockResolvedValueOnce({
          estado: 'activo',
          rol: { nombre: RoleName.DUENO_MASCOTA },
        })
        .mockResolvedValueOnce(null);
      await expect(
        service.exigirAprobado(20, CategoriaServicio.GUARDERIA),
      ).rejects.toThrow(ForbiddenException);
      expect(repo.findOneBy).toHaveBeenCalledWith({
        idUsuario: 20,
        categoria: CategoriaServicio.GUARDERIA,
        estado: 'aprobado',
      });
    },
  );
  it('bloquea a una cuenta inactiva aunque su categoría siga aprobada', async () => {
    repo.findOneBy.mockResolvedValueOnce({ estado: 'inactivo' });
    await expect(
      service.exigirAprobado(20, CategoriaServicio.PASEADOR),
    ).rejects.toThrow(ForbiddenException);
  });
  it('el veterinario aprobado usa su validación existente sin pedir alta de prestador', async () => {
    repo.findOneBy
      .mockResolvedValueOnce({
        estado: 'activo',
        rol: { nombre: RoleName.VETERINARIO },
      })
      .mockResolvedValueOnce({ estadoValidacion: ValidationStatus.APROBADO });
    await expect(
      service.exigirAprobado(20, CategoriaServicio.PELUQUERIA),
    ).resolves.toBeDefined();
    expect(db.getRepository).toHaveBeenCalledWith(Veterinario);
    expect(db.getRepository).not.toHaveBeenCalledWith(SolicitudPrestador);
    expect(repo.findOneBy).toHaveBeenLastCalledWith({
      usuario: { idUsuario: 20 },
      estadoValidacion: ValidationStatus.APROBADO,
    });
  });
  it('un veterinario sin validación profesional no se habilita mediante una solicitud de dueño', async () => {
    repo.findOneBy
      .mockResolvedValueOnce({
        estado: 'activo',
        rol: { nombre: RoleName.VETERINARIO },
      })
      .mockResolvedValueOnce(null);
    await expect(
      service.exigirAprobado(20, CategoriaServicio.PELUQUERIA),
    ).rejects.toThrow(ForbiddenException);
    expect(db.getRepository).not.toHaveBeenCalledWith(SolicitudPrestador);
  });
  it('el dueño sigue necesitando aprobación por categoría', async () => {
    repo.findOneBy
      .mockResolvedValueOnce({
        estado: 'activo',
        rol: { nombre: RoleName.DUENO_MASCOTA },
      })
      .mockResolvedValueOnce({ ...solicitud(), estado: 'aprobado' });
    await expect(
      service.exigirAprobado(20, CategoriaServicio.PASEADOR),
    ).resolves.toMatchObject({ estado: 'aprobado' });
    expect(db.getRepository).not.toHaveBeenCalledWith(Veterinario);
  });
  it('la solicitud de prestador está reservada al rol dueño', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        Reflect.get(PrestadoresController.prototype, 'solicitar') as object,
      ),
    ).toEqual([RoleName.DUENO_MASCOTA]);
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        Reflect.get(PrestadoresController.prototype, 'mias') as object,
      ),
    ).toEqual([RoleName.DUENO_MASCOTA]);
  });
  it('no permite leer evidencia ajena', async () => {
    repo.findOne.mockResolvedValue({ id: 5, idSolicitud: 1 });
    repo.findOneByOrFail.mockResolvedValue(solicitud());
    await expect(service.documento(5, 99, false)).rejects.toThrow(
      ForbiddenException,
    );
  });
  it('no entrega evidencia vencida o inexistente', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.documento(5, 20, false)).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          vence: expect.anything() as unknown,
        }) as unknown,
      }),
    );
  });
  it('permite al administrador revisar el documento sin exponerlo en un listado', async () => {
    const documento = {
      id: 5,
      idSolicitud: 1,
      contenido: Buffer.from('privado'),
    };
    repo.findOne.mockResolvedValue(documento);
    repo.findOneByOrFail.mockResolvedValue(solicitud());
    await expect(service.documento(5, 99, true)).resolves.toBe(documento);
  });
  it.each([
    'identidadRevisada',
    'contactoVerificado',
    'condicionesRevisadas',
  ] as const)('no aprueba sin %s', async (campo) => {
    repo.findOne.mockResolvedValue(solicitud());
    await expect(
      service.revisar(1, 99, { ...revision(), [campo]: false }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it('no aprueba si venció la evidencia', async () => {
    repo.findOne.mockResolvedValue(solicitud());
    em.find.mockResolvedValue([]);
    await expect(service.revisar(1, 99, revision())).rejects.toThrow(
      BadRequestException,
    );
  });
  it('impide que dos revisores sobrescriban decisiones con una versión anterior', async () => {
    repo.findOne.mockResolvedValue(solicitud());
    await expect(
      service.revisar(1, 99, { ...revision(), version: 'anterior' }),
    ).rejects.toThrow(ConflictException);
  });
  it('registra aprobación y notificación juntas sin modificar el rol del dueño', async () => {
    repo.findOne.mockResolvedValue(solicitud());
    em.find.mockResolvedValue([{ tipo: 'identidad' }]);
    await service.revisar(1, 99, revision());
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'aprobado',
        historial: [
          expect.objectContaining({ idAdmin: 99, estado: 'aprobado' }),
        ],
      }),
    );
    expect(em.save).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        usuario: { idUsuario: 20 },
        cuerpo: expect.stringContaining('aprobado') as unknown,
      }),
    );
  });
  it('una suspensión no se evita enviando otra solicitud', async () => {
    repo.findOne
      .mockResolvedValueOnce({ estado: 'activo' })
      .mockResolvedValueOnce({ ...solicitud(), estado: 'suspendido' });
    await expect(service.solicitar(20, dto, [archivo])).rejects.toThrow(
      ConflictException,
    );
    expect(em.delete).not.toHaveBeenCalled();
  });
  it('guardería requiere dirección, capacidad y evidencia del espacio', async () => {
    await expect(
      service.solicitar(
        20,
        { ...dto, categoria: CategoriaServicio.GUARDERIA },
        [archivo],
      ),
    ).rejects.toThrow(BadRequestException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  function turno(
    estado: TurnoServicioEstado = TurnoServicioEstado.CONFIRMADO,
    idDueno = 10,
    fecha = '2026-09-04',
  ) {
    em.findOne.mockResolvedValue({ idTurno: 1 });
    em.findOneOrFail.mockResolvedValue({
      idTurno: 1,
      duenio: { idUsuario: idDueno },
      servicio: {
        usuario: { idUsuario: 20 },
        categoria: CategoriaServicio.PASEADOR,
      },
      estado,
      fecha,
      horaFin: '10:30:00',
    });
  }
  it('solo el dueño puede confirmar que se realizó el servicio', async () => {
    turno();
    await expect(service.completar(99, 1)).rejects.toThrow(ForbiddenException);
    expect(em.save).not.toHaveBeenCalled();
  });
  it('no se pueden completar reservas futuras', async () => {
    turno(TurnoServicioEstado.CONFIRMADO, 10, '2026-09-06');
    await expect(service.completar(10, 1)).rejects.toThrow(BadRequestException);
  });
  it('no se pueden completar reservas canceladas', async () => {
    turno(TurnoServicioEstado.CANCELADO);
    await expect(service.completar(10, 1)).rejects.toThrow(BadRequestException);
  });
  it('el dueño puede completar una reserva al terminar su horario', async () => {
    turno();
    await expect(service.completar(10, 1)).resolves.toEqual({
      estado: 'completado',
    });
  });
  it('no se puede calificar un servicio propio', async () => {
    turno(TurnoServicioEstado.COMPLETADO, 20);
    await expect(
      service.resenar(20, 1, {
        puntuacion: 5,
        comentario: 'Una reseña propia',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('no se puede calificar una reserva sin completar', async () => {
    turno();
    await expect(
      service.resenar(10, 1, {
        puntuacion: 5,
        comentario: 'Muy buen servicio',
      }),
    ).rejects.toThrow(BadRequestException);
  });
  it('no se puede calificar dos veces la misma reserva', async () => {
    turno(TurnoServicioEstado.COMPLETADO);
    em.existsBy.mockResolvedValue(true);
    await expect(
      service.resenar(10, 1, {
        puntuacion: 5,
        comentario: 'Muy buen servicio',
      }),
    ).rejects.toThrow(ConflictException);
  });
  it('un tercero no puede reportar una reserva ajena', async () => {
    turno();
    await expect(
      service.reportar(99, 1, { motivo: 'Reporte de una reserva ajena' }),
    ).rejects.toThrow(ForbiddenException);
  });
  it('permite reportar una cancelación sin suspender automáticamente', async () => {
    turno(TurnoServicioEstado.CANCELADO);
    em.existsBy.mockResolvedValue(false);
    await service.reportar(10, 1, { motivo: 'El prestador canceló al llegar' });
    expect(em.save).toHaveBeenCalledTimes(1);
  });
  it('un reporte duplicado se rechaza', async () => {
    turno();
    em.existsBy.mockResolvedValue(true);
    await expect(
      service.reportar(10, 1, { motivo: 'El prestador canceló al llegar' }),
    ).rejects.toThrow(ConflictException);
  });
  it('los reportes no alteran la validación profesional del veterinario desde el alta de dueños', async () => {
    em.findOne.mockResolvedValue({ id: 1, idTurno: 5, estado: 'pendiente' });
    em.findOneOrFail.mockResolvedValue({
      duenio: { idUsuario: 10 },
      servicio: {
        usuario: { idUsuario: 20, rol: { nombre: RoleName.VETERINARIO } },
        categoria: CategoriaServicio.PELUQUERIA,
      },
    });
    await expect(
      service.resolver(1, 99, {
        suspender: true,
        resolucion: 'Revisar la validación profesional existente.',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(em.save).not.toHaveBeenCalled();
  });
});

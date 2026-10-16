import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Raw, Repository } from 'typeorm';
import { NotificationType } from '../common/enums/notification-type.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { SolicitudCompartirMascotaEstado } from '../common/enums/solicitud-compartir-mascota-estado.enum';
import { Mascota } from '../mascotas/entities/mascota.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { User } from '../users/entities/user.entity';
import { CrearSolicitudCompartirDto } from './dto/crear-solicitud-compartir.dto';
import { DuenoMascotaResponseDto } from './dto/dueno-mascota-response.dto';
import { SolicitudCompartirResponseDto } from './dto/solicitud-compartir-response.dto';
import { UsuarioEncontradoResponseDto } from './dto/usuario-encontrado-response.dto';
import { SolicitudCompartirMascota } from './entities/solicitud-compartir-mascota.entity';

const RELACIONES_SOLICITUD = ['mascota', 'origen', 'destino'];

const MENSAJE_USUARIO_NO_ENCONTRADO =
  'No se encontró ningún usuario con ese dato';
const MENSAJE_SOLO_PRINCIPAL =
  'Solo quien registró la mascota puede compartirla';
const MENSAJE_SIN_PERMISOS = 'No tiene permisos para acceder a este recurso';

interface DuenoFila {
  id_usuario: number;
  created_at: Date;
}

/**
 * Compartir una mascota entre varios dueños (por ejemplo una pareja).
 *
 * La relación mascota-dueños ya era de muchos a muchos (`usuarios_mascotas`),
 * así que una vez aceptada la solicitud no se copia nada: la misma mascota
 * aparece en las cuentas de todos, con sus datos, su historia clínica, sus
 * turnos y su tag, y cualquier cambio se ve en todas.
 *
 * Reglas:
 * - Solo el dueño principal (quien la registró) comparte y quita dueños.
 * - Quien aceptó puede editarla, pero no compartirla ni quitar a otros.
 * - Cualquiera puede dejar de verla. Si se va el principal, lo hereda el dueño
 *   que se sumó primero. El único dueño no puede irse.
 */
@Injectable()
export class MascotasCompartidasService {
  constructor(
    @InjectRepository(SolicitudCompartirMascota)
    private readonly solicitudesRepository: Repository<SolicitudCompartirMascota>,
    @InjectRepository(Mascota)
    private readonly mascotasRepository: Repository<Mascota>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  /**
   * Busca a la persona con la que se quiere compartir, por email o DNI.
   * Devuelve solo el nombre parcial para confirmarla. Si no existe (o no es un
   * dueño de mascotas) responde lo mismo, sin distinguir los casos.
   */
  async buscarUsuario(
    idUsuario: number,
    email?: string,
    documento?: string,
  ): Promise<UsuarioEncontradoResponseDto> {
    const documentoNormalizado = documento?.trim();
    const emailNormalizado = email?.trim().toLowerCase();
    if (!documentoNormalizado && !emailNormalizado) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Ingresá el email o el DNI de la persona',
      });
    }

    const encontrado = documentoNormalizado
      ? await this.usersRepository.findOne({
          where: { numeroDocumento: documentoNormalizado },
        })
      : await this.usersRepository.findOne({
          where: {
            email: Raw((alias) => `LOWER(${alias}) = :email`, {
              email: emailNormalizado,
            }),
          },
        });

    if (!encontrado || encontrado.rol.nombre !== RoleName.DUENO_MASCOTA) {
      throw this.noEncontrado(MENSAJE_USUARIO_NO_ENCONTRADO);
    }

    if (encontrado.idUsuario === idUsuario) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'No podés compartir una mascota con vos mismo',
      });
    }

    return UsuarioEncontradoResponseDto.fromEntity(encontrado);
  }

  async solicitar(
    idUsuario: number,
    dto: CrearSolicitudCompartirDto,
  ): Promise<SolicitudCompartirResponseDto> {
    const mascota = await this.findMascotaConDuenios(dto.idMascota);
    const duenios = await this.listarFilasDuenios(dto.idMascota);

    this.verificarDuenio(duenios, idUsuario);
    if (this.idPrincipal(mascota, duenios) !== idUsuario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: MENSAJE_SOLO_PRINCIPAL,
      });
    }

    if (dto.idUsuarioDestino === idUsuario) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'No podés compartir una mascota con vos mismo',
      });
    }

    const destino = await this.usersRepository.findOne({
      where: { idUsuario: dto.idUsuarioDestino },
    });
    if (!destino || destino.rol.nombre !== RoleName.DUENO_MASCOTA) {
      throw this.noEncontrado(MENSAJE_USUARIO_NO_ENCONTRADO);
    }

    if (duenios.some((fila) => fila.id_usuario === destino.idUsuario)) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Esa persona ya es dueña de esta mascota',
      });
    }

    const pendiente = await this.solicitudesRepository.findOne({
      where: {
        mascota: { idMascota: dto.idMascota },
        destino: { idUsuario: destino.idUsuario },
        estado: SolicitudCompartirMascotaEstado.PENDIENTE,
      },
    });
    if (pendiente) {
      throw this.solicitudDuplicada();
    }

    const origen = await this.usersRepository.findOneOrFail({
      where: { idUsuario },
    });

    let guardada: SolicitudCompartirMascota;
    try {
      guardada = await this.solicitudesRepository.save(
        this.solicitudesRepository.create({
          mascota,
          origen,
          destino,
          estado: SolicitudCompartirMascotaEstado.PENDIENTE,
        }),
      );
    } catch (error) {
      // El índice único parcial frena dos pedidos simultáneos que pasaron la
      // verificación de arriba a la vez.
      if (this.esViolacionDeUnicidad(error)) {
        throw this.solicitudDuplicada();
      }
      throw error;
    }

    await this.notificacionesService.crear(
      destino.idUsuario,
      NotificationType.SOLICITUD_COMPARTIR_MASCOTA,
      'Te quieren compartir una mascota',
      `${this.nombreCorto(origen)} quiere compartir a ${mascota.nombre} con vos.`,
      guardada.idSolicitud,
    );

    return SolicitudCompartirResponseDto.fromEntity(guardada);
  }

  /** Solicitudes pendientes que otras personas me hicieron. */
  async listarRecibidas(
    idUsuario: number,
  ): Promise<SolicitudCompartirResponseDto[]> {
    const solicitudes = await this.solicitudesRepository.find({
      where: {
        destino: { idUsuario },
        estado: SolicitudCompartirMascotaEstado.PENDIENTE,
      },
      relations: RELACIONES_SOLICITUD,
      order: { createdAt: 'DESC' },
    });

    return solicitudes.map((s) => SolicitudCompartirResponseDto.fromEntity(s));
  }

  /** Solicitudes pendientes que yo hice, opcionalmente de una mascota. */
  async listarEnviadas(
    idUsuario: number,
    idMascota?: number,
  ): Promise<SolicitudCompartirResponseDto[]> {
    const solicitudes = await this.solicitudesRepository.find({
      where: {
        origen: { idUsuario },
        estado: SolicitudCompartirMascotaEstado.PENDIENTE,
        ...(idMascota ? { mascota: { idMascota } } : {}),
      },
      relations: RELACIONES_SOLICITUD,
      order: { createdAt: 'DESC' },
    });

    return solicitudes.map((s) => SolicitudCompartirResponseDto.fromEntity(s));
  }

  async aceptar(
    idSolicitud: number,
    idUsuario: number,
  ): Promise<SolicitudCompartirResponseDto> {
    const solicitud = await this.findSolicitudPendienteDelDestino(
      idSolicitud,
      idUsuario,
    );

    await this.dataSource.transaction(async (manager) => {
      await this.cerrarSolicitud(
        manager,
        solicitud,
        SolicitudCompartirMascotaEstado.ACEPTADA,
      );
      await manager.query(
        `INSERT INTO "usuarios_mascotas" ("id_usuario", "id_mascota")
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [idUsuario, solicitud.mascota.idMascota],
      );
    });

    solicitud.estado = SolicitudCompartirMascotaEstado.ACEPTADA;

    await this.notificacionesService.crear(
      solicitud.origen.idUsuario,
      NotificationType.COMPARTIR_MASCOTA_ACEPTADA,
      'Aceptaron tu solicitud',
      `${this.nombreCorto(solicitud.destino)} aceptó compartir a ${solicitud.mascota.nombre}.`,
      solicitud.mascota.idMascota,
    );

    return SolicitudCompartirResponseDto.fromEntity(solicitud);
  }

  async rechazar(
    idSolicitud: number,
    idUsuario: number,
  ): Promise<SolicitudCompartirResponseDto> {
    const solicitud = await this.findSolicitudPendienteDelDestino(
      idSolicitud,
      idUsuario,
    );

    await this.dataSource.transaction((manager) =>
      this.cerrarSolicitud(
        manager,
        solicitud,
        SolicitudCompartirMascotaEstado.RECHAZADA,
      ),
    );
    solicitud.estado = SolicitudCompartirMascotaEstado.RECHAZADA;

    await this.notificacionesService.crear(
      solicitud.origen.idUsuario,
      NotificationType.COMPARTIR_MASCOTA_RECHAZADA,
      'Rechazaron tu solicitud',
      `${this.nombreCorto(solicitud.destino)} no aceptó compartir a ${solicitud.mascota.nombre}.`,
      solicitud.mascota.idMascota,
    );

    return SolicitudCompartirResponseDto.fromEntity(solicitud);
  }

  /** Quien la envió la cancela mientras nadie la haya respondido. */
  async cancelar(
    idSolicitud: number,
    idUsuario: number,
  ): Promise<SolicitudCompartirResponseDto> {
    const solicitud = await this.solicitudesRepository.findOne({
      where: { idSolicitud, origen: { idUsuario } },
      relations: RELACIONES_SOLICITUD,
    });
    if (!solicitud) {
      throw this.noEncontrado('Solicitud no encontrada');
    }

    await this.dataSource.transaction((manager) =>
      this.cerrarSolicitud(
        manager,
        solicitud,
        SolicitudCompartirMascotaEstado.CANCELADA,
      ),
    );
    solicitud.estado = SolicitudCompartirMascotaEstado.CANCELADA;

    return SolicitudCompartirResponseDto.fromEntity(solicitud);
  }

  async listarDuenios(
    idUsuario: number,
    idMascota: number,
  ): Promise<DuenoMascotaResponseDto[]> {
    const mascota = await this.findMascotaConDuenios(idMascota);
    const filas = await this.listarFilasDuenios(idMascota);
    this.verificarDuenio(filas, idUsuario);

    const principal = this.idPrincipal(mascota, filas);
    const porId = new Map(mascota.usuarios.map((u) => [u.idUsuario, u]));

    return filas.map((fila) => ({
      idUsuario: fila.id_usuario,
      nombre: this.nombreCompleto(porId.get(fila.id_usuario)),
      esPrincipal: fila.id_usuario === principal,
      desde: fila.created_at,
    }));
  }

  /** El dueño principal quita a otro dueño de la mascota. */
  async quitarDuenio(
    idUsuario: number,
    idMascota: number,
    idUsuarioQuitado: number,
  ): Promise<void> {
    const mascota = await this.findMascotaConDuenios(idMascota);
    const filas = await this.listarFilasDuenios(idMascota);

    this.verificarDuenio(filas, idUsuario);
    const principal = this.idPrincipal(mascota, filas);
    if (principal !== idUsuario) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: 'Solo quien registró la mascota puede quitar a otros dueños',
      });
    }

    if (idUsuarioQuitado === idUsuario) {
      throw new BadRequestException({
        codigoEstado: 400,
        mensaje: 'Para dejar la mascota usá la opción de salir',
      });
    }

    if (!filas.some((fila) => fila.id_usuario === idUsuarioQuitado)) {
      throw this.noEncontrado('Esa persona no es dueña de esta mascota');
    }

    await this.quitarDeLaMascota(
      this.dataSource.manager,
      idMascota,
      idUsuarioQuitado,
    );

    await this.notificacionesService.crear(
      idUsuarioQuitado,
      NotificationType.COMPARTIR_MASCOTA_BAJA,
      'Ya no ves una mascota',
      `${mascota.nombre} dejó de compartirse con vos.`,
      idMascota,
    );
  }

  /**
   * Un dueño deja de ver la mascota. Para los demás la mascota sigue existiendo.
   * Si quien se va es el principal, lo hereda el dueño que se sumó primero.
   */
  async salir(idUsuario: number, idMascota: number): Promise<void> {
    const mascota = await this.findMascotaConDuenios(idMascota);
    const filas = await this.listarFilasDuenios(idMascota);

    this.verificarDuenio(filas, idUsuario);

    const restantes = filas.filter((fila) => fila.id_usuario !== idUsuario);
    if (restantes.length === 0) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'Sos el único dueño de esta mascota: no podés dejar de verla',
      });
    }

    const principal = this.idPrincipal(mascota, filas);
    const eraPrincipal = principal === idUsuario;
    const nuevoPrincipal = eraPrincipal ? restantes[0].id_usuario : principal;

    await this.dataSource.transaction(async (manager) => {
      if (eraPrincipal) {
        await manager.update(
          Mascota,
          { idMascota },
          {
            idDuenioPrincipal: nuevoPrincipal,
          },
        );
        // Lo que había pedido compartir ya no tiene a nadie que lo respalde.
        await manager.update(
          SolicitudCompartirMascota,
          {
            mascota: { idMascota },
            origen: { idUsuario },
            estado: SolicitudCompartirMascotaEstado.PENDIENTE,
          },
          { estado: SolicitudCompartirMascotaEstado.CANCELADA },
        );
      }
      await this.quitarDeLaMascota(manager, idMascota, idUsuario);
    });

    const quienSeFue = mascota.usuarios.find((u) => u.idUsuario === idUsuario);
    await this.notificacionesService.crear(
      nuevoPrincipal,
      NotificationType.COMPARTIR_MASCOTA_BAJA,
      eraPrincipal
        ? 'Ahora sos el dueño principal'
        : 'Un dueño dejó la mascota',
      eraPrincipal
        ? `${this.nombreCorto(quienSeFue)} dejó de ver a ${mascota.nombre}. Ahora vos sos quien la puede compartir.`
        : `${this.nombreCorto(quienSeFue)} dejó de ver a ${mascota.nombre}.`,
      idMascota,
    );
  }

  private async findMascotaConDuenios(idMascota: number): Promise<Mascota> {
    const mascota = await this.mascotasRepository.findOne({
      where: { idMascota },
      relations: ['usuarios'],
    });

    if (!mascota) {
      throw this.noEncontrado('Mascota no encontrada');
    }

    return mascota;
  }

  /**
   * Dueños de la mascota en el orden en que se sumaron. El orden decide quién
   * hereda la mascota si se va el principal, y la tabla puente es la única que
   * guarda la fecha de unión.
   */
  private listarFilasDuenios(idMascota: number): Promise<DuenoFila[]> {
    return this.mascotasRepository.query(
      `SELECT "id_usuario", "created_at"
       FROM "usuarios_mascotas"
       WHERE "id_mascota" = $1
       ORDER BY "created_at" ASC, "id_usuario" ASC`,
      [idMascota],
    );
  }

  private idPrincipal(mascota: Mascota, filas: DuenoFila[]): number {
    // Una mascota anterior a esta función puede no tener principal cargado.
    return mascota.idDuenioPrincipal ?? filas[0]?.id_usuario;
  }

  private verificarDuenio(filas: DuenoFila[], idUsuario: number): void {
    if (!filas.some((fila) => fila.id_usuario === idUsuario)) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje: MENSAJE_SIN_PERMISOS,
      });
    }
  }

  private async findSolicitudPendienteDelDestino(
    idSolicitud: number,
    idUsuario: number,
  ): Promise<SolicitudCompartirMascota> {
    const solicitud = await this.solicitudesRepository.findOne({
      where: { idSolicitud, destino: { idUsuario } },
      relations: RELACIONES_SOLICITUD,
    });
    if (!solicitud) {
      throw this.noEncontrado('Solicitud no encontrada');
    }

    return solicitud;
  }

  /**
   * Pasa la solicitud a su estado final solo si sigue pendiente. El UPDATE
   * condicional evita que dos respuestas simultáneas (aceptar y cancelar, por
   * ejemplo) se pisen: la segunda no encuentra nada para actualizar.
   */
  private async cerrarSolicitud(
    manager: EntityManager,
    solicitud: SolicitudCompartirMascota,
    estado: SolicitudCompartirMascotaEstado,
  ): Promise<void> {
    const { affected } = await manager.update(
      SolicitudCompartirMascota,
      {
        idSolicitud: solicitud.idSolicitud,
        estado: SolicitudCompartirMascotaEstado.PENDIENTE,
      },
      { estado },
    );

    if (!affected) {
      throw new ConflictException({
        codigoEstado: 409,
        mensaje: 'La solicitud ya fue respondida o cancelada',
      });
    }
  }

  private async quitarDeLaMascota(
    manager: EntityManager,
    idMascota: number,
    idUsuario: number,
  ): Promise<void> {
    await manager.query(
      `DELETE FROM "usuarios_mascotas"
       WHERE "id_mascota" = $1 AND "id_usuario" = $2`,
      [idMascota, idUsuario],
    );
  }

  private solicitudDuplicada(): ConflictException {
    return new ConflictException({
      codigoEstado: 409,
      mensaje:
        'Ya enviaste una solicitud pendiente a esa persona para esta mascota',
    });
  }

  private noEncontrado(mensaje: string): NotFoundException {
    return new NotFoundException({ codigoEstado: 404, mensaje });
  }

  private esViolacionDeUnicidad(error: unknown): boolean {
    const driverError = (error as { driverError?: { code?: string } })
      ?.driverError;
    return driverError?.code === '23505';
  }

  private nombreCorto(user?: Pick<User, 'nombre'>): string {
    return user?.nombre ?? 'Alguien';
  }

  private nombreCompleto(user?: Pick<User, 'nombre' | 'apellido'>): string {
    if (!user) return '';
    return [user.nombre, user.apellido].filter(Boolean).join(' ');
  }
}

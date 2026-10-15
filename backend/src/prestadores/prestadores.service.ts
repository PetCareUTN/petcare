import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { DataSource, EntityManager, MoreThan } from 'typeorm';
import { CategoriaServicio } from '../common/enums/categoria-servicio.enum';
import { RoleName } from '../common/enums/role-name.enum';
import { ValidationStatus } from '../common/enums/validation-status.enum';
import { Veterinario } from '../veterinarios/entities/veterinario.entity';
import { TurnoServicioEstado } from '../common/enums/turno-servicio-estado.enum';
import { NotificationType } from '../common/enums/notification-type.enum';
import { GeocodingService } from '../geocoding/geocoding.service';
import { Notificacion } from '../notificaciones/entities/notificacion.entity';
import { User } from '../users/entities/user.entity';
import { TurnoServicio } from '../turnos-servicios/entities/turno-servicio.entity';
import { SolicitudPrestador } from './entities/solicitud-prestador.entity';
import { DocumentoPrestador } from './entities/documento-prestador.entity';
import { ResenaServicio } from './entities/resena-servicio.entity';
import { ReporteServicio } from './entities/reporte-servicio.entity';
import {
  CrearReporteDto,
  CrearResenaDto,
  ResolverReporteDto,
  RevisarPrestadorDto,
  SolicitarPrestadorDto,
} from './prestadores.dto';

const fallo = (mensaje: string) =>
  new BadRequestException({ codigoEstado: 400, mensaje });

/** Firma del archivo, no el MIME declarado por el cliente. Nunca se sirven HTML/SVG. */
export function mimeDocumento(buffer: Buffer): string {
  if (buffer.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return 'image/jpeg';
  throw fallo('Los documentos deben ser PDF, PNG o JPEG válidos.');
}

@Injectable()
export class PrestadoresService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private readonly logger = new Logger(PrestadoresService.name);
  constructor(
    private readonly db: DataSource,
    private readonly geocoding: GeocodingService,
  ) {}

  onModuleInit() {
    const limpiar = () => {
      void this.eliminarVencidos().catch(() =>
        this.logger.error('No se pudieron eliminar evidencias vencidas.'),
      );
    };
    limpiar();
    this.timer = setInterval(limpiar, 60 * 60 * 1000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async eliminarVencidos() {
    await this.db
      .getRepository(DocumentoPrestador)
      .createQueryBuilder()
      .delete()
      .where('vence <= now()')
      .execute();
  }

  async exigirAprobado(idUsuario: number, categoria: CategoriaServicio) {
    const usuario = await this.db.getRepository(User).findOneBy({ idUsuario });
    if (usuario?.estado !== 'activo')
      throw new ForbiddenException('La cuenta no está activa.');
    // El veterinario conserva su validación profesional existente. No presenta
    // la solicitud de prestador, que corresponde a los dueños en Android.
    if (usuario.rol.nombre === RoleName.VETERINARIO) {
      const veterinario = await this.db.getRepository(Veterinario).findOneBy({
        usuario: { idUsuario },
        estadoValidacion: ValidationStatus.APROBADO,
      });
      if (!veterinario)
        throw new ForbiddenException(
          'Su cuenta de veterinario no está validada',
        );
      return { identidadRevisada: false, referenciasComprobadas: false };
    }
    if (usuario.rol.nombre !== RoleName.DUENO_MASCOTA)
      throw new ForbiddenException();
    const solicitud = await this.db
      .getRepository(SolicitudPrestador)
      .findOneBy({ idUsuario, categoria, estado: 'aprobado' });
    if (!solicitud) {
      throw new ForbiddenException({
        codigoEstado: 403,
        mensaje:
          'El prestador necesita aprobación vigente para esta categoría. Revisá la solicitud en Quiero ofrecer un servicio.',
      });
    }
    return solicitud;
  }

  async mias(idUsuario: number) {
    const solicitudes = await this.db
      .getRepository(SolicitudPrestador)
      .find({ where: { idUsuario }, order: { id: 'DESC' } });
    return Promise.all(solicitudes.map((s) => this.detalle(s)));
  }
  async listar() {
    const solicitudes = await this.db
      .getRepository(SolicitudPrestador)
      .find({ order: { actualizada: 'DESC' } });
    return Promise.all(solicitudes.map((s) => this.detalle(s)));
  }
  private async detalle(s: SolicitudPrestador) {
    const documentos = await this.db
      .getRepository(DocumentoPrestador)
      .find({ where: { idSolicitud: s.id, vence: MoreThan(new Date()) } });
    return {
      ...s,
      documentos: documentos.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        mime: d.mime,
        vence: d.vence,
      })),
    };
  }

  async solicitar(
    idUsuario: number,
    dto: SolicitarPrestadorDto,
    archivos: Express.Multer.File[],
  ) {
    if (!archivos.some((f) => f.fieldname === 'identidad'))
      throw fallo('Adjuntá un documento de identidad.');
    if (
      dto.categoria !== CategoriaServicio.PASEADOR &&
      !archivos.some((f) => f.fieldname === 'evidencia')
    )
      throw fallo(
        'Adjuntá fotos del espacio o evidencia de tus trabajos según la categoría.',
      );
    if (dto.categoria === CategoriaServicio.GUARDERIA && !dto.capacidad)
      throw fallo('Indicá la capacidad máxima de la guardería.');
    const documentos = archivos.map((f) => ({
      tipo: f.fieldname as 'identidad' | 'evidencia',
      mime: mimeDocumento(f.buffer),
      contenido: f.buffer,
    }));
    // Best-effort: si Google no encuentra la dirección o la API key no está
    // configurada, la solicitud se guarda igual, sin coordenadas.
    const geocodificado = await this.geocoding.geocodificar(dto.direccion);
    return this.db.transaction(async (em) => {
      // Serializa solicitudes de una misma cuenta, incluso cuando todavía no existe la categoría.
      const usuario = await em.getRepository(User).findOne({
        where: { idUsuario },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });
      if (!usuario || usuario.estado !== 'activo')
        throw new ForbiddenException();
      const repo = em.getRepository(SolicitudPrestador);
      let s = await repo.findOne({
        where: { idUsuario, categoria: dto.categoria },
        lock: { mode: 'pessimistic_write' },
      });
      if (s && !['correccion', 'rechazado'].includes(s.estado))
        throw new ConflictException({
          codigoEstado: 409,
          mensaje:
            'La solicitud ya está pendiente, aprobada o suspendida. Una suspensión requiere revisión administrativa.',
        });
      s ??= repo.create({ idUsuario, categoria: dto.categoria, historial: [] });
      s.datos = {
        nombreCompleto: dto.nombreCompleto,
        numeroDocumento: dto.numeroDocumento,
        telefono: dto.telefono,
        experiencia: dto.experiencia,
        referencias: dto.referencias ?? '',
        protocolo: dto.protocolo,
        direccion: dto.direccion,
        capacidad: dto.capacidad ?? null,
      };
      s.latitud = geocodificado?.latitud ?? null;
      s.longitud = geocodificado?.longitud ?? null;
      s.estado = 'pendiente';
      s.identidadRevisada = false;
      s.contactoVerificado = false;
      s.referenciasComprobadas = false;
      s.actualizada = new Date();
      s.historial.push({
        estado: 'pendiente',
        motivo:
          'Solicitud enviada; consentimiento de revisión y conservación de archivos por 30 días.',
        idAdmin: null,
        fecha: s.actualizada.toISOString(),
      });
      await repo.save(s);
      await em.delete(DocumentoPrestador, { idSolicitud: s.id });
      for (const d of documentos)
        await em.save(
          DocumentoPrestador,
          em.create(DocumentoPrestador, {
            ...d,
            idSolicitud: s.id,
            vence: new Date(Date.now() + 30 * 86400000),
          }),
        );
      await this.notificar(
        em,
        idUsuario,
        'Solicitud de prestador recibida',
        `Tu solicitud de ${s.categoria} está pendiente. Podés seguir usando PetCare como dueño.`,
      );
      return {
        id: s.id,
        estado: s.estado,
        advertenciaUbicacion: geocodificado?.precisionBaja
          ? 'No pudimos ubicar tu dirección con precisión. Revisá que incluya calle, número y localidad; igualmente guardamos una ubicación aproximada.'
          : undefined,
      };
    });
  }

  /**
   * Ubicación aprobada de un prestador (dueño de mascota) para una
   * categoría, usada por ServiciosService para mostrar sus servicios en el
   * mapa. Devuelve null si no tiene una solicitud aprobada.
   */
  async obtenerUbicacion(
    idUsuario: number,
    categoria: CategoriaServicio,
  ): Promise<{
    direccion: string | null;
    latitud: number | null;
    longitud: number | null;
  } | null> {
    const solicitud = await this.db.getRepository(SolicitudPrestador).findOne(
      {
        where: { idUsuario, categoria, estado: 'aprobado' },
      },
    );
    if (!solicitud) return null;
    return {
      direccion: solicitud.datos.direccion,
      latitud: solicitud.latitud,
      longitud: solicitud.longitud,
    };
  }

  async documento(id: number, idUsuario: number, esAdmin: boolean) {
    const doc = await this.db.getRepository(DocumentoPrestador).findOne({
      where: { id, vence: MoreThan(new Date()) },
      select: ['id', 'idSolicitud', 'mime', 'contenido'],
    });
    if (!doc) throw new NotFoundException();
    const solicitud = await this.db
      .getRepository(SolicitudPrestador)
      .findOneByOrFail({ id: doc.idSolicitud });
    if (!esAdmin && solicitud.idUsuario !== idUsuario)
      throw new ForbiddenException();
    return doc;
  }

  async revisar(id: number, idAdmin: number, dto: RevisarPrestadorDto) {
    return this.db.transaction(async (em) => {
      const repo = em.getRepository(SolicitudPrestador);
      const s = await repo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!s) throw new NotFoundException();
      if (s.idUsuario === idAdmin)
        throw new ForbiddenException('No podés revisar tu propia solicitud.');
      if (s.actualizada.toISOString() !== dto.version)
        throw new ConflictException(
          'La solicitud cambió. Recargá antes de revisarla.',
        );
      if (
        dto.estado === 'suspendido'
          ? s.estado !== 'aprobado'
          : !['pendiente', 'suspendido'].includes(s.estado)
      )
        throw fallo('La transición de estado no está permitida.');
      if (dto.estado === 'aprobado') {
        if (
          !dto.identidadRevisada ||
          !dto.contactoVerificado ||
          !dto.condicionesRevisadas
        )
          throw fallo(
            'Verificá identidad, contacto y condiciones del servicio antes de aprobar.',
          );
        const docs = await em.find(DocumentoPrestador, {
          where: { idSolicitud: id, vence: MoreThan(new Date()) },
        });
        if (
          !docs.some((d) => d.tipo === 'identidad') ||
          (s.categoria !== CategoriaServicio.PASEADOR &&
            !docs.some((d) => d.tipo === 'evidencia'))
        )
          throw fallo(
            'La evidencia venció o está incompleta. Solicitá correcciones para que vuelva a adjuntarla.',
          );
        if (dto.referenciasComprobadas && !s.datos.referencias.trim())
          throw fallo('No hay referencias informadas para comprobar.');
      }
      s.estado = dto.estado;
      if (dto.estado === 'aprobado') {
        s.identidadRevisada = dto.identidadRevisada;
        s.contactoVerificado = dto.contactoVerificado;
        s.referenciasComprobadas = dto.referenciasComprobadas;
      }
      s.actualizada = new Date();
      s.historial.push({
        estado: dto.estado,
        motivo: dto.motivo,
        idAdmin,
        fecha: s.actualizada.toISOString(),
      });
      await repo.save(s);
      await this.notificar(
        em,
        s.idUsuario,
        'Revisión de prestador',
        `${s.categoria}: ${dto.estado}. ${dto.motivo}`,
      );
      return { id: s.id, estado: s.estado };
    });
  }

  private async turnoPropio(
    em: EntityManager,
    idTurno: number,
    idUsuario: number,
  ) {
    // Bloqueo separado para evitar FOR UPDATE sobre joins externos.
    const locked = await em.findOne(TurnoServicio, {
      where: { idTurno },
      lock: { mode: 'pessimistic_write' },
    });
    if (!locked) throw new NotFoundException();
    const t = await em.findOneOrFail(TurnoServicio, {
      where: { idTurno },
      relations: ['duenio', 'servicio', 'servicio.usuario'],
    });
    if (
      t.duenio.idUsuario !== idUsuario ||
      t.servicio.usuario.idUsuario === idUsuario
    )
      throw new ForbiddenException();
    return t;
  }
  async completar(idUsuario: number, idTurno: number) {
    return this.db.transaction(async (em) => {
      const t = await this.turnoPropio(em, idTurno, idUsuario);
      if (t.estado !== TurnoServicioEstado.CONFIRMADO)
        throw fallo('Solo podés completar reservas confirmadas.');
      if (
        new Date(`${t.fecha}T${t.horaFin.slice(0, 8)}-03:00`).getTime() >
        Date.now()
      )
        throw fallo('Esperá a que termine el horario de la reserva.');
      t.estado = TurnoServicioEstado.COMPLETADO;
      await em.save(t);
      return { estado: t.estado };
    });
  }
  async resenar(idUsuario: number, idTurno: number, dto: CrearResenaDto) {
    return this.db.transaction(async (em) => {
      const t = await this.turnoPropio(em, idTurno, idUsuario);
      if (t.estado !== TurnoServicioEstado.COMPLETADO)
        throw fallo('La reserva debe estar completada para dejar una reseña.');
      if (await em.existsBy(ResenaServicio, { idTurno }))
        throw new ConflictException('Ya calificaste esta reserva.');
      return em.save(
        ResenaServicio,
        em.create(ResenaServicio, { idTurno, ...dto }),
      );
    });
  }
  async reportar(idUsuario: number, idTurno: number, dto: CrearReporteDto) {
    return this.db.transaction(async (em) => {
      await this.turnoPropio(em, idTurno, idUsuario);
      if (await em.existsBy(ReporteServicio, { idTurno }))
        throw new ConflictException('Ya reportaste esta reserva.');
      return em.save(
        ReporteServicio,
        em.create(ReporteServicio, { idTurno, motivo: dto.motivo }),
      );
    });
  }
  async reservas(idUsuario: number) {
    const turnos = await this.db.getRepository(TurnoServicio).find({
      where: { duenio: { idUsuario } },
      relations: ['servicio', 'servicio.usuario', 'mascota'],
      order: { fecha: 'DESC' },
    });
    return Promise.all(
      turnos.map(async (t) => ({
        idTurno: t.idTurno,
        idPrestador: t.servicio.usuario.idUsuario,
        prestador:
          `${t.servicio.usuario.nombre} ${t.servicio.usuario.apellido ?? ''}`.trim(),
        categoria: t.servicio.categoria,
        mascota: t.mascota.nombre,
        fecha: t.fecha,
        horaFin: t.horaFin,
        estado: t.estado,
        resena: await this.db
          .getRepository(ResenaServicio)
          .findOneBy({ idTurno: t.idTurno }),
        reporte:
          (
            await this.db
              .getRepository(ReporteServicio)
              .findOneBy({ idTurno: t.idTurno })
          )?.estado ?? null,
      })),
    );
  }
  async reportes() {
    const reportes = await this.db
      .getRepository(ReporteServicio)
      .find({ order: { fecha: 'DESC' } });
    return Promise.all(
      reportes.map(async (r) => {
        const t = await this.db.getRepository(TurnoServicio).findOneOrFail({
          where: { idTurno: r.idTurno },
          relations: ['servicio', 'servicio.usuario', 'duenio'],
        });
        const solicitud = await this.db
          .getRepository(SolicitudPrestador)
          .findOneBy({
            idUsuario: t.servicio.usuario.idUsuario,
            categoria: t.servicio.categoria,
          });
        return {
          ...r,
          categoria: t.servicio.categoria,
          idPrestador: t.servicio.usuario.idUsuario,
          prestador: t.servicio.usuario.nombre,
          denunciante: t.duenio.nombre,
          idSolicitud:
            t.servicio.usuario.rol.nombre === RoleName.DUENO_MASCOTA
              ? (solicitud?.id ?? null)
              : null,
        };
      }),
    );
  }
  async resolver(id: number, idAdmin: number, dto: ResolverReporteDto) {
    return this.db.transaction(async (em) => {
      const r = await em.findOne(ReporteServicio, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!r) throw new NotFoundException();
      if (r.estado !== 'pendiente')
        throw new ConflictException('El reporte ya fue resuelto.');
      const t = await em.findOneOrFail(TurnoServicio, {
        where: { idTurno: r.idTurno },
        relations: ['servicio', 'servicio.usuario', 'duenio'],
      });
      if ([t.servicio.usuario.idUsuario, t.duenio.idUsuario].includes(idAdmin))
        throw new ForbiddenException();
      if (dto.suspender) {
        if (t.servicio.usuario.rol.nombre === RoleName.VETERINARIO) {
          throw fallo(
            'La validación de este veterinario se gestiona en el módulo de veterinarios.',
          );
        }
        const s = await em.findOne(SolicitudPrestador, {
          where: {
            idUsuario: t.servicio.usuario.idUsuario,
            categoria: t.servicio.categoria,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!s)
          throw fallo(
            'Este prestador no tiene solicitud; ya está bloqueado para nuevas publicaciones y reservas.',
          );
        s.estado = 'suspendido';
        s.actualizada = new Date();
        s.historial.push({
          estado: 'suspendido',
          motivo: `Reporte ${r.id}: ${dto.resolucion}`,
          idAdmin,
          fecha: s.actualizada.toISOString(),
        });
        await em.save(s);
        await this.notificar(
          em,
          s.idUsuario,
          'Servicio suspendido',
          `${s.categoria}: ${dto.resolucion}. Contactá a administración para solicitar una revisión.`,
        );
      }
      r.estado = 'resuelto';
      r.resolucion = dto.resolucion;
      r.idAdmin = idAdmin;
      r.resueltoEn = new Date();
      await em.save(r);
      await this.notificar(
        em,
        t.duenio.idUsuario,
        'Reporte revisado',
        dto.resolucion,
      );
      return { estado: r.estado };
    });
  }
  async perfil(idUsuario: number, categoria: CategoriaServicio) {
    const s = await this.exigirAprobado(idUsuario, categoria);
    const completados = await this.db.getRepository(TurnoServicio).countBy({
      servicio: { usuario: { idUsuario }, categoria },
      estado: TurnoServicioEstado.COMPLETADO,
    });
    const resenas = await this.db
      .getRepository(ResenaServicio)
      .createQueryBuilder('r')
      .innerJoin(TurnoServicio, 't', 't.id_turno = r."idTurno"')
      .innerJoin('t.servicio', 'servicio')
      .innerJoin('t.duenio', 'duenio')
      .where(
        'servicio.id_usuario = :idUsuario AND servicio.categoria = :categoria',
        { idUsuario, categoria },
      )
      .select([
        'r.id AS id',
        'r.puntuacion AS puntuacion',
        'r.comentario AS comentario',
        'r.fecha AS fecha',
        'duenio.nombre AS autor',
      ])
      .orderBy('r.fecha', 'DESC')
      .getRawMany<{
        id: number;
        puntuacion: number;
        comentario: string;
        fecha: Date;
        autor: string;
      }>();
    return {
      identidadRevisada: s.identidadRevisada,
      referenciasComprobadas: s.referenciasComprobadas,
      serviciosCompletados: completados,
      promedio: resenas.length
        ? resenas.reduce((sum, r) => sum + r.puntuacion, 0) / resenas.length
        : null,
      resenas,
    };
  }
  private async notificar(
    em: EntityManager,
    idUsuario: number,
    titulo: string,
    mensaje: string,
  ) {
    await em.save(
      Notificacion,
      em.create(Notificacion, {
        usuario: { idUsuario },
        tipo: NotificationType.SOLICITUD_RECIBIDA,
        titulo,
        cuerpo: mensaje,
      }),
    );
  }
}
